/**
 * Feature 4 — Document Types & Person Documents
 * Spec: features/feature-4-document-types-and-person-documents.md
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
});
