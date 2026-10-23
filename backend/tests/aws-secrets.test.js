/**
 * Feature 50 — SMTP Password from AWS Secrets Manager
 * Spec: features/feature-50-aws-secrets-smtp-password.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import db from "../app/models/index.js";
import { emailTransport, sendTemplateEmail } from "../app/utils/emailDelivery.js";
import { syncTestDatabase, resetTestDatabase } from "./helpers.js";

const ENV_KEYS = [
  "EMAIL_MODE",
  "EMAIL_FILE_DIR",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_PASSWORD_SECRET_ID",
  "SECRETS_AGENT_TOKEN_FILE",
];

const SECRET_READ_FAILED = "Could not read the SMTP password from AWS Secrets Manager.";

describe("Feature 50 — SMTP Password from AWS Secrets Manager", () => {
  let savedEnv;
  let tempDir;
  let tokenFile;
  let agentCalls;
  let agentResponse;
  let transportOptions;
  const originalFetch = globalThis.fetch;
  const originalCreate = emailTransport.create;

  const sendOne = async () => {
    const org = await db.organization.create({ name: "Secrets Org", email: "office@example.org" });
    const trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic" });
    const person = await db.person.create({
      firstName: "Ana",
      lastName: "Lopez",
      email: "ana@example.org",
    });
    return sendTemplateEmail({
      template: {
        orgId: org.id,
        fromEmail: "office@example.org",
        toAddress: "ana@example.org",
        subject: "Welcome",
        emailBody: "See you soon.",
      },
      tripId: trip.id,
      personId: person.id,
    });
  };

  const useSmtpWithSecret = () => {
    Object.assign(process.env, {
      EMAIL_MODE: "smtp",
      SMTP_HOST: "email-smtp.us-east-1.amazonaws.com",
      SMTP_PORT: "587",
      SMTP_USER: "ses-user",
      SMTP_PASSWORD_SECRET_ID: "SES_EMAIL_PASSWORD",
    });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trips-secrets-"));
    tokenFile = path.join(tempDir, "awssmatoken");
    fs.writeFileSync(tokenFile, "agent-token\n");
    process.env.SECRETS_AGENT_TOKEN_FILE = tokenFile;
    process.env.EMAIL_FILE_DIR = path.join(tempDir, "mail");

    agentCalls = [];
    agentResponse = { ok: true, status: 200, body: { SecretString: "ses-password" } };
    globalThis.fetch = async (url, options) => {
      agentCalls.push({ url, headers: options?.headers });
      return {
        ok: agentResponse.ok,
        status: agentResponse.status,
        json: async () => agentResponse.body,
      };
    };

    transportOptions = [];
    emailTransport.create = (options) => {
      transportOptions.push(options);
      return { sendMail: async () => ({ messageId: "<ses@example>" }) };
    };
  });

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    globalThis.fetch = originalFetch;
    emailTransport.create = originalCreate;
    fs.rmSync(tempDir, { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-50.1 — Read the mail server password from AWS Secrets Manager", () => {
    it("SMTP password comes from AWS Secrets Manager", async () => {
      useSmtpWithSecret();

      const result = await sendOne();

      expect(agentCalls).toEqual([
        {
          url: "http://localhost:2773/secretsmanager/get?secretId=SES_EMAIL_PASSWORD",
          headers: { "X-Aws-Parameters-Secrets-Token": "agent-token" },
        },
      ]);
      expect(transportOptions).toHaveLength(1);
      expect(transportOptions[0].auth).toEqual({ user: "ses-user", pass: "ses-password" });
      expect(result.status).toBe("sent");
    });

    it("SMTP password setting is used when no secret is named", async () => {
      useSmtpWithSecret();
      process.env.SMTP_PASSWORD_SECRET_ID = "";
      process.env.SMTP_PASSWORD = "env-password";

      const result = await sendOne();

      expect(agentCalls).toHaveLength(0);
      expect(transportOptions[0].auth).toEqual({ user: "ses-user", pass: "env-password" });
      expect(result.status).toBe("sent");
    });

    it("Email fails when the secret cannot be read", async () => {
      useSmtpWithSecret();
      agentResponse = { ok: false, status: 400, body: {} };

      const result = await sendOne();

      expect(result).toEqual({ status: "failed", reason: SECRET_READ_FAILED });
      expect(transportOptions).toHaveLength(0);
      expect(await db.emailLog.count()).toBe(0);
    });

    it("Email fails when the token file is missing", async () => {
      useSmtpWithSecret();
      fs.rmSync(tokenFile);

      const result = await sendOne();

      expect(agentCalls).toHaveLength(0);
      expect(result).toEqual({ status: "failed", reason: SECRET_READ_FAILED });
      expect(transportOptions).toHaveLength(0);
    });

    it("File mode does not call the agent", async () => {
      process.env.EMAIL_MODE = "file";
      process.env.SMTP_PASSWORD_SECRET_ID = "SES_EMAIL_PASSWORD";

      const result = await sendOne();

      expect(agentCalls).toHaveLength(0);
      expect(result.status).toBe("sent");
      expect(
        fs.readdirSync(path.join(tempDir, "mail")).filter((name) => name.endsWith(".txt"))
      ).toHaveLength(1);
    });
  });
});
