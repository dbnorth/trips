/**
 * Feature 58 — Participant Documents PDF
 * Spec: features/feature-58-participant-documents-pdf.md
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

const TESTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const TINY_HEIC = fs.readFileSync(path.join(TESTS_DIR, "fixtures/tiny.heic"));
const UPLOADS_DIR = path.resolve("documents/people");
const writtenFiles = [];

/** Write an uploaded document file and return its stored file name. */
const writeUpload = (name, data) => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const fileName = `feature58-${name}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, fileName), data);
  writtenFiles.push(path.join(UPLOADS_DIR, fileName));
  return `people/${fileName}`;
};

const twoPagePdf = async () => {
  const pdf = await PdfLibDocument.create();
  pdf.addPage([200, 300]);
  pdf.addPage([200, 300]);
  return Buffer.from(await pdf.save());
};

const binaryParser = (res, callback) => {
  const chunks = [];
  res.on("data", (chunk) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
};

describe("Feature 58 — Participant Documents PDF", () => {
  let admin;
  let trip;

  const addPerson = (firstName, lastName, extra = {}) =>
    db.person.create({ firstName, lastName, email: `${firstName.toLowerCase()}@example.org`, ...extra });

  const addAssignment = async (personId, tripId = trip.id) =>
    db.tripPeopleRole.create({
      tripId,
      peopleId: personId,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });

  const addType = (description, type = "certification", extra = {}) =>
    db.documentType.create({ description, type, ...extra });

  const addDocument = (person, documentType, fields = {}) =>
    db.personDocument.create({
      personId: person.id,
      documentTypeId: documentType.id,
      countryIssued: "US",
      expirationDate: "2031-06-15",
      ...fields,
    });

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    admin = await createOrgAdminUser({ email: "admin@example.org", orgName: "Hope Mission" });
    trip = await db.trip.create({
      orgId: admin.org.id,
      name: "Guatemala Clinic",
      location: "Antigua",
      country: "Guatemala",
      startDate: "2027-01-02",
      endDate: "2027-01-09",
      status: "active",
    });
  });

  afterEach(async () => {
    for (const file of writtenFiles.splice(0)) fs.rmSync(file, { force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-58.1 — Download a participant's documents as one PDF", () => {
    it("Documents PDF data for a participant", async () => {
      const ana = await addPerson("Ana", "Lopez", { middleName: "Maria" });
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Passport", "passport"), {
        documentNumber: "P1234567",
        issueDate: "2021-06-15",
        expirationDate: "2031-06-15",
      });

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.organization).toEqual({ name: "Hope Mission", logoFile: null });
      expect(data.title).toBe("Documents for Ana Maria Lopez");
      expect(data.trip).toEqual({
        name: "Guatemala Clinic",
        location: "Antigua, Guatemala",
        dates: "January 2, 2027 to January 9, 2027",
      });
      expect(data.documents).toEqual([
        {
          type: "Passport",
          documentNumber: "P1234567",
          countryIssued: "United States",
          issueDate: "June 15, 2021",
          expirationDate: "June 15, 2031",
          specializations: [],
        },
      ]);
    });

    it("Specializations are listed under their document", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);
      const certification = await addDocument(ana, await addType("Board certification"));
      await db.personDocumentSpecialization.create({
        personDocumentId: certification.id,
        name: "Pediatrics",
        specializationDate: "2024-03-01",
        documentFileName: "people/missing-pediatrics.png",
      });
      await db.personDocumentSpecialization.create({
        personDocumentId: certification.id,
        name: "Emergency",
        specializationDate: "2025-05-10",
        documentFileName: "people/missing-emergency.png",
      });

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.documents[0].specializations).toEqual([
        { name: "Pediatrics", date: "March 1, 2024" },
        { name: "Emergency", date: "May 10, 2025" },
      ]);
    });

    it("A page for each document and specialization", async () => {
      const ana = await addPerson("Ana", "Lopez", { middleName: "Maria" });
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Passport", "passport"), {
        documentFileName: writeUpload("passport.png", TINY_PNG),
      });
      const certification = await addDocument(ana, await addType("Board certification"), {
        documentFileName: writeUpload("board.png", TINY_PNG),
      });
      await db.personDocumentSpecialization.create({
        personDocumentId: certification.id,
        name: "Pediatrics",
        specializationDate: "2024-03-01",
        documentFileName: writeUpload("pediatrics.png", TINY_PNG),
      });

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.participantName).toBe("Ana Maria Lopez");
      expect(data.pages.map((page) => page.title)).toEqual([
        "Board certification",
        "Pediatrics",
        "Passport",
      ]);
      expect(data.pages[0].details).toContainEqual(["Type", "Board certification"]);
      expect(data.pages[1].details).toEqual([
        ["Document type", "Board certification"],
        ["Specialization", "Pediatrics"],
        ["Date", "March 1, 2024"],
      ]);
      expect(data.pages.map((page) => page.file.kind)).toEqual(["image", "image", "image"]);
    });

    it("Uploaded PDF pages follow the document page", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Nursing licence", "medical_licence"), {
        documentFileName: writeUpload("licence.pdf", await twoPagePdf()),
      });

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      const pdf = await PdfLibDocument.load(res.body);
      const sizes = pdf.getPages().map((page) => [page.getWidth(), page.getHeight()]);
      expect(sizes).toEqual([
        [612, 792],
        [612, 792],
        [200, 300],
        [200, 300],
      ]);
    });

    it("HEIC image is shown", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Passport", "passport"), {
        documentFileName: writeUpload("passport.heic", TINY_HEIC),
      });

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.pages[0].file.kind).toBe("image");
      expect(data.pages[0].file.data.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    });

    it("Document without a file", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Passport", "passport"));

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.pages[0].file).toEqual({ kind: "message", message: "No file uploaded." });
    });

    it("Document type without an expiration date", async () => {
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Diploma", "diploma", { hasExpirationDate: false }), {
        expirationDate: null,
      });

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.documents[0].expirationDate).toBe("—");
      expect(data.pages[0].details).toContainEqual(["Expiration date", "—"]);
    });

    it("Participant with no documents", async () => {
      const ben = await addPerson("Ben", "Cruz");
      const assignment = await addAssignment(ben.id);

      const data = await buildParticipantDocumentsData(trip.id, assignment.id);

      expect(data.documents).toEqual([]);
      expect(data.pages).toEqual([]);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);
      const pdf = await PdfLibDocument.load(res.body);
      expect(pdf.getPageCount()).toBe(1);
    });

    it("Staff download the documents PDF", async () => {
      const ana = await addPerson("Ana", "Lopez", { middleName: "Maria" });
      const assignment = await addAssignment(ana.id);
      await addDocument(ana, await addType("Passport", "passport"), {
        documentFileName: writeUpload("passport-download.png", TINY_PNG),
      });

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(admin.authHeader)
        .buffer(true)
        .parse(binaryParser);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/pdf/);
      expect(res.headers["content-disposition"]).toContain('filename="Documents - Ana Lopez.pdf"');
      expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
    });

    it("Assignment from another trip", async () => {
      const otherTrip = await db.trip.create({
        orgId: admin.org.id,
        name: "Honduras Clinic",
        startDate: "2027-03-01",
        endDate: "2027-03-08",
        status: "active",
      });
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id, otherTrip.id);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(admin.authHeader);

      expect(res.status).toBe(404);
    });

    it("Participants cannot download the documents PDF", async () => {
      const participant = await registerUser({
        email: "pat@example.org",
        firstName: "Pat",
        lastName: "Participant",
        orgIds: [admin.org.id],
      });
      await addAssignment(participant.user.personId);
      const ana = await addPerson("Ana", "Lopez");
      const assignment = await addAssignment(ana.id);

      const res = await request(app)
        .get(`/trips/trips/${trip.id}/participants/${assignment.id}/documents/pdf`)
        .set(participant.authHeader);

      expect(res.status).toBe(403);
    });
  });
});
