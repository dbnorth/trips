/**
 * Feature 96 — Convert HEIC Uploads to JPEG
 * Spec: features/feature-96-heic-to-jpeg-on-upload.md
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { convertHeicDocuments } from "../app/scripts/convertHeicDocuments.js";
import { encryptDocument } from "../app/utils/documentEncryption.js";
import { syncTestDatabase, resetTestDatabase, createOrgAdminUser, createDocumentType } from "./helpers.js";

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const IPHONE_HEIC = fs.readFileSync(path.join(TESTS_DIR, "fixtures/tiny.heic"));
const BROKEN_HEIC = Buffer.concat([IPHONE_HEIC.subarray(0, 40), Buffer.alloc(50)]);
const ENV_KEYS = ["FILE_ENCRYPTION_KEY", "FILE_ENCRYPTION_KEY_SECRET_ID"];
const WATCHED_DIRS = [
  "documents/people",
  "images/people",
  "images/logos",
  "images/trips",
  "images/email-pictures",
].map((dir) => path.resolve(dir));
const DOCUMENT_UNREADABLE = "This HEIC photo couldn't be read. Upload it as a JPG, PNG, or PDF instead.";
const PICTURE_UNREADABLE = "This HEIC photo couldn't be read. Upload it as a JPG or PNG instead.";

const isJpeg = (data) => data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));

const decrypt = (data) => {
  const key = Buffer.from(process.env.FILE_ENCRYPTION_KEY, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, data.subarray(9, 21));
  decipher.setAuthTag(data.subarray(data.length - 16));
  return Buffer.concat([decipher.update(data.subarray(21, data.length - 16)), decipher.final()]);
};

const storedDocument = (documentFileName) => fs.readFileSync(path.resolve("documents", documentFileName));
const storedImage = (stored) => fs.readFileSync(path.resolve("images", stored));
const listFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []);

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("Feature 96 — Convert HEIC Uploads to JPEG", () => {
  let savedEnv;
  let filesBefore;
  let ana;
  let passport;

  const uploadPassport = (data, filename) =>
    request(app)
      .post(`/trips/people/${ana.user.personId}/documents`)
      .set(ana.authHeader)
      .field("documentTypeId", String(passport.id))
      .field("expirationDate", "2031-06-15")
      .attach("document", data, { filename, contentType: "image/heic" });

  /** Write a stored document file the way it was uploaded before Feature 96. */
  const plantDocument = (name, data) => {
    const documentFileName = `people/${name}`;
    fs.mkdirSync(path.resolve("documents/people"), { recursive: true });
    fs.writeFileSync(path.resolve("documents", documentFileName), data);
    return documentFileName;
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    process.env.FILE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
    filesBefore = new Map(WATCHED_DIRS.map((dir) => [dir, new Set(listFiles(dir))]));

    ana = await createOrgAdminUser({ email: "ana@example.org", orgName: "Hope Clinics" });
    passport = await createDocumentType({
      orgId: ana.org.id,
      type: "passport",
      description: "Passport",
      hasExpirationDate: true,
    });
  });

  afterEach(async () => {
    for (const dir of WATCHED_DIRS) {
      for (const name of listFiles(dir)) {
        if (!filesBefore.get(dir).has(name)) fs.rmSync(path.join(dir, name), { force: true });
      }
    }
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-96.1 — HEIC documents can be viewed and downloaded as JPEG", () => {
    it("A HEIC document is stored as JPEG", async () => {
      const upload = await uploadPassport(IPHONE_HEIC, "iphone.heic");

      expect(upload.status).toBe(200);
      const { id, documentFileName } = upload.body;
      expect(documentFileName).toMatch(/^people\/person-\d+-\d+-iphone\.jpg$/);
      const stored = storedDocument(documentFileName);
      expect(stored.subarray(0, 8).toString("ascii")).toBe("TRIPSENC");
      expect(isJpeg(decrypt(stored))).toBe(true);

      const base = `/trips/people/${ana.user.personId}/documents/${id}`;
      const view = await request(app).get(`${base}/view`).set(ana.authHeader).buffer(true).parse(binaryParser);
      expect(view.status).toBe(200);
      expect(view.headers["content-type"]).toMatch(/^image\/jpeg/);
      expect(isJpeg(view.body)).toBe(true);
      const download = await request(app).get(`${base}/download`).set(ana.authHeader).buffer(true).parse(binaryParser);
      expect(download.headers["content-disposition"]).toMatch(/-iphone\.jpg"$/);
    });

    it("A HEIC specialization file is stored as JPEG", async () => {
      const certification = await createDocumentType({
        orgId: ana.org.id,
        type: "certification",
        description: "Board Certification",
        allowSpecialization: true,
      });
      const pediatrics = await db.documentTypeSpecialization.create({
        documentTypeId: certification.id,
        name: "Pediatrics",
      });

      const upload = await request(app)
        .post(`/trips/people/${ana.user.personId}/documents`)
        .set(ana.authHeader)
        .field("documentTypeId", String(certification.id))
        .field("expirationDate", "2031-06-15")
        .field(
          "specializations",
          JSON.stringify([{ documentTypeSpecializationId: pediatrics.id, date: "2024-03-01" }])
        )
        .attach("specializationFiles", IPHONE_HEIC, { filename: "iphone.heic", contentType: "image/heic" });

      expect(upload.status).toBe(200);
      const { documentFileName } = upload.body.specializations[0];
      expect(documentFileName).toMatch(/-iphone\.jpg$/);
      expect(isJpeg(decrypt(storedDocument(documentFileName)))).toBe(true);
    });

    it("An unreadable HEIC document is refused", async () => {
      const upload = await uploadPassport(BROKEN_HEIC, "broken.heic");

      expect(upload.status).toBe(400);
      expect(upload.body.message).toBe(DOCUMENT_UNREADABLE);
      expect(await db.personDocument.count({ where: { personId: ana.user.personId } })).toBe(0);
      expect(listFiles(WATCHED_DIRS[0])).toEqual([...filesBefore.get(WATCHED_DIRS[0])]);
    });

    it("Existing HEIC documents are converted on startup", async () => {
      const key = Buffer.from(process.env.FILE_ENCRYPTION_KEY, "base64");
      const ben = await db.person.create({ firstName: "Ben", lastName: "Ruiz", email: "ben@example.org" });
      const stamp = Date.now();
      const anaPassport = await db.personDocument.create({
        personId: ana.user.personId,
        documentTypeId: passport.id,
        expirationDate: "2031-06-15",
        documentFileName: plantDocument(`person-${ana.user.personId}-${stamp}-A.HEIC`, encryptDocument(key, IPHONE_HEIC)),
      });
      const benPassport = await db.personDocument.create({
        personId: ben.id,
        documentTypeId: passport.id,
        expirationDate: "2031-06-15",
        documentFileName: plantDocument(`person-${ben.id}-${stamp}-B.heic`, IPHONE_HEIC),
      });
      const brokenName = plantDocument(`person-${ben.id}-${stamp}-broken.heic`, BROKEN_HEIC);
      const broken = await db.personDocument.create({
        personId: ben.id,
        documentTypeId: passport.id,
        expirationDate: "2031-06-15",
        documentFileName: brokenName,
      });

      await convertHeicDocuments();

      for (const [row, oldName] of [
        [anaPassport, anaPassport.documentFileName],
        [benPassport, benPassport.documentFileName],
      ]) {
        const { documentFileName } = await row.reload();
        expect(documentFileName).toBe(oldName.replace(/\.heic$/i, ".jpg"));
        const stored = storedDocument(documentFileName);
        expect(stored.subarray(0, 8).toString("ascii")).toBe("TRIPSENC");
        expect(isJpeg(decrypt(stored))).toBe(true);
        expect(fs.existsSync(path.resolve("documents", oldName))).toBe(false);
      }
      expect((await broken.reload()).documentFileName).toBe(brokenName);
      expect(storedDocument(brokenName)).toEqual(BROKEN_HEIC);
    });
  });

  describe("US-96.2 — HEIC photos can be used as pictures", () => {
    it("A HEIC profile picture, logo, and trip image are stored as JPEG", async () => {
      const trip = await db.trip.create({ orgId: ana.org.id, name: "Haiti", status: "active" });
      const heic = { filename: "iphone.heic", contentType: "image/heic" };

      const picture = await request(app)
        .put(`/trips/people/${ana.user.personId}/picture`)
        .set(ana.authHeader)
        .attach("picture", IPHONE_HEIC, heic);
      const logo = await request(app)
        .put(`/trips/organizations/${ana.org.id}/logo`)
        .set(ana.authHeader)
        .attach("logo", IPHONE_HEIC, heic);
      const image = await request(app)
        .put(`/trips/trips/${trip.id}/image`)
        .set(ana.authHeader)
        .attach("image", IPHONE_HEIC, heic);

      expect(picture.status).toBe(200);
      expect(picture.body.picture).toMatch(/^people\/person-\d+-\d+\.jpg$/);
      expect(isJpeg(storedImage(picture.body.picture))).toBe(true);
      expect(logo.status).toBe(200);
      expect(logo.body.logo).toMatch(/^logos\/org-\d+-\d+\.jpg$/);
      expect(isJpeg(storedImage(logo.body.logo))).toBe(true);
      expect(image.status).toBe(200);
      expect(image.body.image).toMatch(/^trips\/trip-\d+-\d+\.jpg$/);
      expect(isJpeg(storedImage(image.body.image))).toBe(true);
    });

    it("A HEIC email picture is stored as JPEG", async () => {
      const upload = await request(app)
        .post("/trips/email-pictures")
        .set(ana.authHeader)
        .field("orgId", String(ana.org.id))
        .attach("file", IPHONE_HEIC, { filename: "iphone.heic", contentType: "image/heic" });

      expect(upload.status).toBe(200);
      expect(upload.body).toMatchObject({ name: "iphone", contentType: "image/jpeg" });
      expect(upload.body.url).toMatch(/^images\/email-pictures\/org-\d+-[0-9a-f]{32}\.jpg$/);
      const stored = storedImage(upload.body.url.replace(/^images\//, ""));
      expect(isJpeg(stored)).toBe(true);
      expect(upload.body.sizeBytes).toBe(stored.length);
    });

    it("An unreadable HEIC picture is refused", async () => {
      const first = await request(app)
        .put(`/trips/people/${ana.user.personId}/picture`)
        .set(ana.authHeader)
        .attach("picture", IPHONE_HEIC, { filename: "iphone.heic", contentType: "image/heic" });
      const current = first.body.picture;
      const peopleImagesBefore = listFiles(WATCHED_DIRS[1]);

      const upload = await request(app)
        .put(`/trips/people/${ana.user.personId}/picture`)
        .set(ana.authHeader)
        .attach("picture", BROKEN_HEIC, { filename: "broken.heic", contentType: "image/heic" });

      expect(upload.status).toBe(400);
      expect(upload.body.message).toBe(PICTURE_UNREADABLE);
      expect((await db.person.findByPk(ana.user.personId)).picture).toBe(current);
      expect(fs.existsSync(path.resolve("images", current))).toBe(true);
      expect(listFiles(WATCHED_DIRS[1])).toEqual(peopleImagesBefore);
    });
  });
});
