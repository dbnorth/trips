/**
 * Feature 63 — Encrypt Person Documents on Disk
 * Spec: features/feature-63-encrypt-person-documents.md
 */

import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { PDFDocument as PdfLibDocument } from "pdf-lib";
import app from "../server.js";
import db from "../app/models/index.js";
import { buildParticipantDocumentsData } from "../app/utils/participantDocumentsPdf.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  TINY_PNG,
} from "./helpers.js";

const ENV_KEYS = ["FILE_ENCRYPTION_KEY", "FILE_ENCRYPTION_KEY_SECRET_ID", "SECRETS_AGENT_TOKEN_FILE"];
const DOCUMENTS_DIR = path.resolve("documents");
const KEY_READ_FAILED = "Could not read the document encryption key.";
const DECRYPT_FAILED = "The document could not be decrypted.";

const newKey = () => crypto.randomBytes(32).toString("base64");

const decryptWith = (base64Key, data) => {
  const nonce = data.subarray(9, 21);
  const decipher = crypto.createDecipheriv("aes-256-gcm", Buffer.from(base64Key, "base64"), nonce);
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(21, data.length - 16)), decipher.final()]);
};

const onePagePdf = async () => {
  const pdf = await PdfLibDocument.create();
  pdf.addPage([200, 300]);
  return Buffer.from(await pdf.save());
};

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

const peopleFiles = () => {
  const dir = path.join(DOCUMENTS_DIR, "people");
  return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
};

describe("Feature 63 — Encrypt Person Documents on Disk", () => {
  let savedEnv;
  let tempDir;
  let agentCalls;
  let agentResponse;
  let filesBefore;
  const originalFetch = globalThis.fetch;

  const storedFile = (documentFileName) =>
    fs.readFileSync(path.join(DOCUMENTS_DIR, documentFileName));

  const addType = (fields = {}) =>
    db.documentType.create({ type: "passport", description: "Passport", ...fields });

  const uploadDocument = (owner, documentType, data, filename, contentType) =>
    request(app)
      .post(`/trips/people/${owner.user.personId}/documents`)
      .set(owner.authHeader)
      .field("documentTypeId", String(documentType.id))
      .field("expirationDate", "2031-06-15")
      .attach("document", data, { filename, contentType });

  const uploadWithSpecialization = async (owner, data) => {
    const documentType = await addType({
      type: "certification",
      description: "Board certification",
      allowSpecialization: true,
    });
    const pediatrics = await db.documentTypeSpecialization.create({
      documentTypeId: documentType.id,
      name: "Pediatrics",
    });
    return request(app)
      .post(`/trips/people/${owner.user.personId}/documents`)
      .set(owner.authHeader)
      .field("documentTypeId", String(documentType.id))
      .field("expirationDate", "2031-06-15")
      .field(
        "specializations",
        JSON.stringify([{ documentTypeSpecializationId: pediatrics.id, date: "2024-03-01" }])
      )
      .attach("specializationFiles", data, { filename: "pediatrics.png", contentType: "image/png" });
  };

  const download = (owner, documentId, authHeader = owner.authHeader) =>
    request(app)
      .get(`/trips/people/${owner.user.personId}/documents/${documentId}/download`)
      .set(authHeader)
      .buffer(true)
      .parse(binaryParser);

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.FILE_ENCRYPTION_KEY = newKey();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trips-doc-key-"));
    const tokenFile = path.join(tempDir, "awssmatoken");
    fs.writeFileSync(tokenFile, "agent-token\n");
    process.env.SECRETS_AGENT_TOKEN_FILE = tokenFile;

    agentCalls = [];
    agentResponse = { ok: true, status: 200, body: { SecretString: newKey() } };
    globalThis.fetch = async (url, options) => {
      agentCalls.push({ url, headers: options?.headers });
      return {
        ok: agentResponse.ok,
        status: agentResponse.status,
        json: async () => agentResponse.body,
      };
    };
    filesBefore = new Set(peopleFiles());
  });

  afterEach(async () => {
    for (const name of peopleFiles()) {
      if (!filesBefore.has(name)) fs.rmSync(path.join(DOCUMENTS_DIR, "people", name), { force: true });
    }
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    globalThis.fetch = originalFetch;
    fs.rmSync(tempDir, { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-63.1 — Store uploaded documents encrypted on disk", () => {
    it("Uploaded document is encrypted on disk", async () => {
      const owner = await registerUser({ email: "enc-owner@example.com" });
      const pdf = await onePagePdf();

      const upload = await uploadDocument(owner, await addType(), pdf, "passport.pdf", "application/pdf");

      expect(upload.status).toBe(200);
      expect(upload.body.documentFileName).toMatch(/^people\/.+\.pdf$/);
      const stored = storedFile(upload.body.documentFileName);
      expect(stored.subarray(0, 8).toString("ascii")).toBe("TRIPSENC");
      expect(stored.subarray(0, 4).toString("latin1")).not.toBe("%PDF");
      expect(stored.includes(pdf)).toBe(false);
      expect(decryptWith(process.env.FILE_ENCRYPTION_KEY, stored)).toEqual(pdf);
    });

    it("Uploaded specialization file is encrypted on disk", async () => {
      const owner = await registerUser({ email: "enc-spec@example.com" });

      const upload = await uploadWithSpecialization(owner, TINY_PNG);

      expect(upload.status).toBe(200);
      const stored = storedFile(upload.body.specializations[0].documentFileName);
      expect(stored.subarray(0, 8).toString("ascii")).toBe("TRIPSENC");
      expect(stored.includes(TINY_PNG)).toBe(false);
    });

    it("Upload fails and keeps nothing when the key cannot be read", async () => {
      const owner = await registerUser({ email: "enc-nokey@example.com" });
      process.env.FILE_ENCRYPTION_KEY = "";

      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      expect(upload.status).toBe(500);
      expect(upload.body.message).toBe(KEY_READ_FAILED);
      expect(peopleFiles().filter((name) => !filesBefore.has(name))).toEqual([]);
      expect(await db.personDocument.count()).toBe(0);
    });
  });

  describe("US-63.2 — Documents still open, download, and print", () => {
    it("Download returns the original document", async () => {
      const owner = await registerUser({ email: "enc-download@example.com" });
      const pdf = await onePagePdf();
      const upload = await uploadDocument(owner, await addType(), pdf, "passport.pdf", "application/pdf");
      const fileName = path.basename(upload.body.documentFileName);

      const res = await download(owner, upload.body.id);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(pdf);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toBe(`attachment; filename="${fileName}"`);
    });

    it("View returns the original specialization file inline", async () => {
      const owner = await registerUser({ email: "enc-view@example.com" });
      const upload = await uploadWithSpecialization(owner, TINY_PNG);
      const specialization = upload.body.specializations[0];
      const fileName = path.basename(specialization.documentFileName);

      const res = await request(app)
        .get(
          `/trips/people/${owner.user.personId}/documents/${upload.body.id}/specializations/${specialization.id}/view`
        )
        .set(owner.authHeader)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(TINY_PNG);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["content-disposition"]).toBe(`inline; filename="${fileName}"`);
    });

    it("Unencrypted file from before this feature still downloads", async () => {
      const owner = await registerUser({ email: "enc-legacy@example.com" });
      const pdf = await onePagePdf();
      const legacyName = `people/feature63-legacy-${Date.now()}.pdf`;
      fs.mkdirSync(path.join(DOCUMENTS_DIR, "people"), { recursive: true });
      fs.writeFileSync(path.join(DOCUMENTS_DIR, legacyName), pdf);
      const row = await db.personDocument.create({
        personId: owner.user.personId,
        documentTypeId: (await addType()).id,
        expirationDate: "2031-06-15",
        documentFileName: legacyName,
      });

      const res = await download(owner, row.id);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(pdf);
    });

    it("Unauthorized user still cannot download", async () => {
      const owner = await registerUser({ email: "enc-subject@example.com" });
      const stranger = await registerUser({ email: "enc-stranger@example.com" });
      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      const res = await download(owner, upload.body.id, stranger.authHeader);

      expect(res.status).toBe(403);
    });

    it("Wrong key fails without partial content", async () => {
      const owner = await registerUser({ email: "enc-wrongkey@example.com" });
      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");
      process.env.FILE_ENCRYPTION_KEY = newKey();

      const res = await request(app)
        .get(`/trips/people/${owner.user.personId}/documents/${upload.body.id}/download`)
        .set(owner.authHeader);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ message: DECRYPT_FAILED });
    });

    it("Documents PDF includes decrypted files", async () => {
      const admin = await createOrgAdminUser({ email: "enc-admin@example.org", orgName: "Hope Mission" });
      const trip = await db.trip.create({
        orgId: admin.org.id,
        name: "Guatemala Clinic",
        startDate: "2027-01-02",
        endDate: "2027-01-09",
        status: "active",
      });
      const owner = await registerUser({ email: "enc-participant@example.com" });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: owner.user.personId,
        roleId: (await findRole("Trip Participant")).id,
        status: "approved",
      });
      const pdf = await onePagePdf();
      await uploadDocument(owner, await addType(), pdf, "passport.pdf", "application/pdf");
      await uploadWithSpecialization(owner, TINY_PNG);

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.pages.map((page) => [page.title, page.file.kind])).toEqual([
        ["Board certification", "message"],
        ["Pediatrics", "image"],
        ["Passport", "pdf"],
      ]);
      expect(data.pages[0].file.message).toBe("No file uploaded.");
      expect(data.pages[1].file.data).toEqual(TINY_PNG);
      expect(data.pages[2].file.data).toEqual(pdf);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);
      expect(res.status).toBe(200);
      const merged = await PdfLibDocument.load(res.body);
      expect(merged.getPages().some((page) => page.getWidth() === 200)).toBe(true);
    });
  });

  describe("US-63.3 — Read the encryption key from AWS Secrets Manager", () => {
    it("Key comes from AWS Secrets Manager", async () => {
      const owner = await registerUser({ email: "enc-agent@example.com" });
      const agentKey = agentResponse.body.SecretString;
      process.env.FILE_ENCRYPTION_KEY_SECRET_ID = "DOC_ENCRIPTION_KEY";

      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      expect(upload.status).toBe(200);
      expect(agentCalls[0]).toEqual({
        url: "http://localhost:2773/secretsmanager/get?secretId=DOC_ENCRIPTION_KEY",
        headers: { "X-Aws-Parameters-Secrets-Token": "agent-token" },
      });
      const stored = storedFile(upload.body.documentFileName);
      expect(decryptWith(agentKey, stored)).toEqual(TINY_PNG);
      expect(() => decryptWith(process.env.FILE_ENCRYPTION_KEY, stored)).toThrow();

      const res = await download(owner, upload.body.id);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(TINY_PNG);
    });

    it("Env key is used when no secret is named", async () => {
      const owner = await registerUser({ email: "enc-envkey@example.com" });

      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      expect(upload.status).toBe(200);
      expect(agentCalls).toHaveLength(0);
      const stored = storedFile(upload.body.documentFileName);
      expect(decryptWith(process.env.FILE_ENCRYPTION_KEY, stored)).toEqual(TINY_PNG);
    });

    it("Upload fails when the agent returns an error", async () => {
      const owner = await registerUser({ email: "enc-agenterr@example.com" });
      process.env.FILE_ENCRYPTION_KEY_SECRET_ID = "DOC_ENCRIPTION_KEY";
      agentResponse = { ok: false, status: 400, body: {} };

      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      expect(upload.status).toBe(500);
      expect(upload.body.message).toBe(KEY_READ_FAILED);
      expect(peopleFiles().filter((name) => !filesBefore.has(name))).toEqual([]);
    });

    it("Key of the wrong length is rejected", async () => {
      const owner = await registerUser({ email: "enc-shortkey@example.com" });
      process.env.FILE_ENCRYPTION_KEY = crypto.randomBytes(16).toString("base64");

      const upload = await uploadDocument(owner, await addType(), TINY_PNG, "passport.png", "image/png");

      expect(upload.status).toBe(500);
      expect(upload.body.message).toBe(KEY_READ_FAILED);
    });
  });
});
