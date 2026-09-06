/**
 * Feature 4 — Document Types & Person Documents
 * Spec: features/feature-4-document-types-and-person-documents.md
 *
 * Feature 22 — Document Type Number Required & Instructions
 * Spec: features/feature-22-document-number-and-instructions.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createSystemAdminUser,
  TINY_PNG,
} from "./helpers.js";

describe("Feature 4 — Document Types & Person Documents", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-4.1 — Administer document types", () => {
    it("System Admin creates a document type", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "doctype-admin@example.com",
      });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ type: "passport", description: "US Passport" });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        type: "passport",
        description: "US Passport",
        documentNumberRequired: false,
      });

      const list = await request(app).get("/trips/document-types").set(authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((d) => d.id)).toContain(create.body.id);
    });

    it("Non-admin cannot delete a document type", async () => {
      const docType = await db.documentType.create({
        type: "passport",
        description: "Protected Passport Type",
      });
      const { authHeader } = await registerUser({
        email: "not-doc-admin@example.com",
      });

      const response = await request(app)
        .delete(`/trips/document-types/${docType.id}`)
        .set(authHeader);

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/Forbidden/i);

      const stillThere = await db.documentType.findByPk(docType.id);
      expect(stillThere).not.toBeNull();
    });
  });

  describe("US-4.2 — Upload and manage person documents", () => {
    it("User uploads a person document", async () => {
      const { authHeader, user } = await registerUser({
        email: "doc-owner@example.com",
      });
      const docType = await db.documentType.create({
        type: "passport",
        description: "Passport",
      });

      const upload = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(docType.id))
        .field("countryIssued", "US")
        .field("issueDate", "2020-01-15")
        .field("expirationDate", "2030-01-15")
        .attach("document", TINY_PNG, {
          filename: "passport.png",
          contentType: "image/png",
        });

      expect(upload.status).toBe(200);
      expect(upload.body).toMatchObject({
        personId: user.personId,
        documentTypeId: docType.id,
        countryIssued: "US",
        expirationDate: "2030-01-15",
        documentNumber: null,
      });
      expect(upload.body.documentFileName).toMatch(/^people\//);

      const stored = await db.personDocument.findByPk(upload.body.id);
      expect(stored).not.toBeNull();

      const download = await request(app)
        .get(`/trips/people/${user.personId}/documents/${upload.body.id}/download`)
        .set(authHeader);

      expect(download.status).toBe(200);
      expect(download.body.length).toBeGreaterThan(0);
    });

    it("Unauthorized user cannot view another person's document", async () => {
      const owner = await registerUser({ email: "doc-subject@example.com" });
      const stranger = await registerUser({ email: "doc-stranger@example.com" });
      const docType = await db.documentType.create({
        type: "medical_licence",
        description: "Medical Licence",
      });

      const upload = await request(app)
        .post(`/trips/people/${owner.user.personId}/documents`)
        .set(owner.authHeader)
        .field("documentTypeId", String(docType.id))
        .field("expirationDate", "2031-06-01")
        .attach("document", TINY_PNG, {
          filename: "licence.png",
          contentType: "image/png",
        });

      expect(upload.status).toBe(200);

      const view = await request(app)
        .get(
          `/trips/people/${owner.user.personId}/documents/${upload.body.id}/view`
        )
        .set(stranger.authHeader);

      expect(view.status).toBe(403);
      expect(view.body.message).toMatch(/Forbidden/i);
    });
  });

  describe("Feature 22 — Document number required & instructions", () => {
    it("System Admin saves document number required and instructions", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "doc-number-admin@example.com",
      });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({
          type: "passport",
          description: "Passport with number",
          documentNumberRequired: true,
          instructions: "Upload a clear photo of the photo page.",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        documentNumberRequired: true,
        instructions: "Upload a clear photo of the photo page.",
      });

      const get = await request(app)
        .get(`/trips/document-types/${create.body.id}`)
        .set(authHeader);

      expect(get.status).toBe(200);
      expect(get.body.documentNumberRequired).toBe(true);
      expect(get.body.instructions).toBe("Upload a clear photo of the photo page.");

      const list = await request(app).get("/trips/document-types").set(authHeader);
      const listed = list.body.find((d) => d.id === create.body.id);
      expect(listed.documentNumberRequired).toBe(true);
      expect(listed.instructions).toBe("Upload a clear photo of the photo page.");
    });

    it("Document number required defaults to unchecked", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "doc-default-admin@example.com",
      });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ type: "medical_licence", description: "Licence no number" });

      expect(create.status).toBe(200);
      expect(create.body.documentNumberRequired).toBe(false);
      expect(create.body.instructions).toBeNull();
    });

    it("System Admin can create a Certification document type", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "doc-cert-admin@example.com",
      });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({
          type: "certification",
          description: "First Aid Certification",
          documentNumberRequired: true,
          instructions: "Upload both sides of the card.",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        type: "certification",
        description: "First Aid Certification",
        documentNumberRequired: true,
        instructions: "Upload both sides of the card.",
      });

      const list = await request(app).get("/trips/document-types").set(authHeader);
      expect(list.body.map((d) => d.id)).toContain(create.body.id);
      expect(list.body.find((d) => d.id === create.body.id).type).toBe("certification");
    });

    it("API rejects missing document number when required", async () => {
      const { authHeader, user } = await registerUser({
        email: "doc-number-owner@example.com",
      });
      const docType = await db.documentType.create({
        type: "passport",
        description: "Numbered Passport",
        documentNumberRequired: true,
        instructions: "Include the passport number.",
      });

      const beforeCount = await db.personDocument.count();

      const upload = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(docType.id))
        .field("expirationDate", "2030-01-15")
        .attach("document", TINY_PNG, {
          filename: "passport.png",
          contentType: "image/png",
        });

      expect(upload.status).toBe(400);
      expect(upload.body.message).toMatch(/Document number is required/i);
      expect(await db.personDocument.count()).toBe(beforeCount);

      const uploadOk = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(docType.id))
        .field("documentNumber", "P1234567")
        .field("expirationDate", "2030-01-15")
        .attach("document", TINY_PNG, {
          filename: "passport.png",
          contentType: "image/png",
        });

      expect(uploadOk.status).toBe(200);
      expect(uploadOk.body.documentNumber).toBe("P1234567");
    });

    it("Person document can be saved without uploading a file", async () => {
      const { authHeader, user } = await registerUser({
        email: "doc-no-file@example.com",
      });
      const docType = await db.documentType.create({
        type: "certification",
        description: "First Aid",
      });

      const create = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(docType.id))
        .field("countryIssued", "US")
        .field("issueDate", "2024-01-01")
        .field("expirationDate", "2027-01-01");

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        personId: user.personId,
        documentTypeId: docType.id,
        expirationDate: "2027-01-01",
        documentFileName: null,
      });
    });
  });
});
