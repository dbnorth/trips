import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import db from "../models/index.js";
import logger from "../config/logger.js";
import {
  SINGLE_TOKEN_PATTERN,
  buildSourceValues,
  buildTokenValues,
  substituteRecipients,
  substituteTokens,
} from "./emailTokenValues.js";

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Tests replace `create` so smtp mode never reaches a real mail server. */
export const emailTransport = {
  create: (options) => nodemailer.createTransport(options),
};

const readSettings = () => {
  const env = process.env;
  return {
    mode: (env.EMAIL_MODE || "").trim() === "smtp" ? "smtp" : "file",
    fileDir: path.resolve(backendDir, env.EMAIL_FILE_DIR || "test-mail"),
    host: env.SMTP_HOST || "localhost",
    port: Number(env.SMTP_PORT) || 25,
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER || "",
    password: env.SMTP_PASSWORD || "",
    passwordSecretId: (env.SMTP_PASSWORD_SECRET_ID || "").trim(),
    secretsTokenFile: (env.SECRETS_AGENT_TOKEN_FILE || "").trim() || "/var/run/awssmatoken",
  };
};

/** The mail server may only send from this verified address. */
const SENDER_ADDRESS = "notifications@missiontrips.app";
const SENDER_APP_NAME = "Mission Trips";

const fullName = (firstName, lastName) =>
  [firstName, lastName].map((part) => part.trim()).filter(Boolean).join(" ");

/**
 * Name of whoever owns the template's From email: the token's owner, or for a typed address
 * the first of organization, primary trip leader, participant whose email matches. "" when none.
 */
const senderName = async ({ fromEntry, fromAddress, tripId, personId, orgId }) => {
  const trip = tripId != null ? await db.trip.findByPk(tripId, { attributes: ["orgId"] }) : null;
  const values = await buildSourceValues({ orgId: trip?.orgId ?? orgId ?? null, tripId, personId });
  const owners = [
    { emailSource: "organization.email", name: values["organization.name"].trim() },
    {
      emailSource: "primaryLeader.email",
      name: fullName(values["primaryLeader.firstName"], values["primaryLeader.lastName"]),
    },
    {
      emailSource: "participant.email",
      name: fullName(values["participant.firstName"], values["participant.lastName"]),
    },
  ];

  const token = SINGLE_TOKEN_PATTERN.exec(fromEntry.trim());
  if (token) {
    const row = await db.emailToken.findOne({ where: { tokenCode: token[1] } });
    return owners.find((owner) => owner.emailSource === row?.valueSource)?.name ?? "";
  }
  const address = fromAddress.toLowerCase();
  return (
    owners.find((owner) => values[owner.emailSource].trim().toLowerCase() === address)?.name ?? ""
  );
};

const quoteDisplayName = (name) => `"${name.replace(/(["\\])/g, "\\$1")}"`;

const senderFrom = (name) =>
  `${quoteDisplayName(name ? `${name} via ${SENDER_APP_NAME}` : SENDER_APP_NAME)} <${SENDER_ADDRESS}>`;

const SECRETS_AGENT_URL = "http://localhost:2773/secretsmanager/get";
const SECRET_READ_FAILED = "Could not read the SMTP password from AWS Secrets Manager.";

/** Read a plain-text secret from the AWS Secrets Manager Agent running on this server. */
const readSecret = async (secretId, tokenFile) => {
  const token = (await fs.readFile(tokenFile, "utf8")).trim();
  const response = await fetch(`${SECRETS_AGENT_URL}?secretId=${encodeURIComponent(secretId)}`, {
    headers: { "X-Aws-Parameters-Secrets-Token": token },
  });
  if (!response.ok) throw new Error(`Secrets Manager Agent returned status ${response.status}.`);
  const { SecretString } = await response.json();
  if (typeof SecretString !== "string" || !SecretString) {
    throw new Error("Secret has no SecretString.");
  }
  return SecretString;
};

const smtpPassword = async (settings) => {
  if (!settings.passwordSecretId) return settings.password;
  try {
    return await readSecret(settings.passwordSecretId, settings.secretsTokenFile);
  } catch (err) {
    logger.error(`Reading secret ${settings.passwordSecretId} failed: ${err.message}`);
    throw new Error(SECRET_READ_FAILED);
  }
};

const fileStamp = (date) =>
  date.toISOString().replace(/[-:]/g, "").replace("T", "-").replace(".", "-").replace("Z", "");

const writeMessageFile = async (dir, message) => {
  await fs.mkdir(dir, { recursive: true });
  const sentAt = new Date();
  const fileName = `${fileStamp(sentAt)}-${crypto.randomBytes(3).toString("hex")}.txt`;
  const lines = [`Date: ${sentAt.toISOString()}`, `From: ${message.from}`];
  if (message.replyTo) lines.push(`Reply-To: ${message.replyTo}`);
  lines.push(`To: ${message.to}`, `Subject: ${message.subject}`, "", message.text);
  await fs.writeFile(path.join(dir, fileName), lines.join("\n"), "utf8");
  return fileName;
};

const deliver = async (settings, message) => {
  if (settings.mode === "file") return writeMessageFile(settings.fileDir, message);
  const auth = settings.user ? { user: settings.user, pass: await smtpPassword(settings) } : null;
  const transport = emailTransport.create({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    ...(auth ? { auth } : {}),
  });
  const info = await transport.sendMail(message);
  return info.messageId;
};

/**
 * The email one template sends to one trip participant, with tokens filled in.
 * `toEmail`, `subject`, and `emailBody` replace the template's when given.
 * Returns `{ message }`, or `{ reason }` when there is no recipient or sender.
 */
export const buildTemplateMessage = async ({
  template,
  tripId,
  personId,
  toEmail,
  subject,
  emailBody,
}) => {
  const values = await buildTokenValues({ orgId: template.orgId, tripId, personId });
  const to =
    toEmail !== undefined
      ? String(toEmail ?? "").trim()
      : substituteRecipients(template.toAddress, values);
  if (!to) return { reason: "No recipients." };
  const templateFrom = substituteTokens(template.fromEmail, values).trim();
  if (!templateFrom) return { reason: "No sender." };

  const name = await senderName({
    fromEntry: template.fromEmail,
    fromAddress: templateFrom,
    tripId,
    personId,
    orgId: template.orgId,
  });
  const message = {
    from: senderFrom(name),
    replyTo: templateFrom,
    to,
    subject: substituteTokens(subject ?? template.subject, values),
    text: substituteTokens(emailBody ?? template.emailBody, values),
  };
  return { message };
};

/**
 * When the trip's organization (the template's with no trip) is in test mode, send to the
 * organization email instead, naming the real recipients on the first line.
 * Returns `{ message }` or `{ reason }`.
 */
const applyOrganizationTestMode = async (tripId, templateOrgId, message) => {
  const trip = tripId != null ? await db.trip.findByPk(tripId, { attributes: ["orgId"] }) : null;
  const orgId = trip ? trip.orgId : templateOrgId;
  const org = orgId
    ? await db.organization.findByPk(orgId, { attributes: ["testMode", "email"] })
    : null;
  if (!org?.testMode) return { message };
  const orgEmail = (org.email || "").trim();
  if (!orgEmail) return { reason: "Test mode: the organization has no email." };
  return {
    message: {
      ...message,
      to: orgEmail,
      subject: `[Test] ${message.subject}`,
      text: `TEST MODE - intended for: ${message.to}\n\n${message.text}`,
    },
  };
};

/**
 * Send one template to one trip participant with tokens filled in, and record it in `emailLog`.
 * Takes the same options as `buildTemplateMessage`.
 * Returns `{ status: "sent", emailLogId }`, `{ status: "skipped", reason }`, or `{ status: "failed", reason }`.
 */
export const sendTemplateEmail = async (options) => {
  const { template, tripId, personId } = options;
  const built = await buildTemplateMessage(options);
  if (!built.message) return { status: "skipped", reason: built.reason };
  const { message, reason } = await applyOrganizationTestMode(tripId, template.orgId, built.message);
  if (!message) return { status: "skipped", reason };
  const { to } = message;
  const settings = readSettings();

  let emailId;
  try {
    emailId = await deliver(settings, message);
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    return { status: "failed", reason: err.message };
  }

  const log = await db.emailLog.create({
    toEmail: to,
    fromEmail: message.from,
    subject: message.subject,
    content: message.text,
    emailId,
    emailTemplateId: template.id,
    tripId,
    personId,
  });
  return { status: "sent", emailLogId: log.id };
};
