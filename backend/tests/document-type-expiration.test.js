/**
 * Feature 57 — Document Type Has Expiration Date
 * Spec: features/feature-57-document-type-expiration-date.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  completePersonProfile,
  TINY_PNG,
  createDocumentType,
  createOrganization,
} from "./helpers.js";

const applicationBody = (tripWorkerRoleId, signatureName) => ({
  tripWorkerRoleId,
  willSelfFund: true,
  flightPurchaseOption: "self",
  willRaiseFunds: false,
  hasPreferredRoommate: false,
  isPregnant: false,
  agreementAccepted: true,
  agreementSignatureName: signatureName,
});

const createTripWithRole = async (
  authHeader,
  orgId,
  { name, requirePassport = false, requiredDocumentTypeIds = [] }
) => {
  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId,
      name,
      status: "active",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      participantCost: 1800,
      requirePassport,
    });
  expect(trip.status).toBe(200);

  const workerRole = await request(app)
    .post("/trips/worker-roles")
    .set(authHeader)
    .send({ orgId, name: "Nurse", requiredDocumentTypeIds });
  expect(workerRole.status).toBe(200);

  const tripWorkerRole = await request(app)
    .post("/trips/trip-worker-roles")
    .set(authHeader)
    .send({ tripId: trip.body.id, workerRoleId: workerRole.body.id, quantity: 2 });
  expect(tripWorkerRole.status).toBe(200);

  return { trip: trip.body, tripWorkerRole: tripWorkerRole.body };
};

describe("Feature 57 — Document Type Has Expiration Date", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-57.1 — Mark whether a document type has an expiration date", () => {
    it("Has Expiration Date is saved on the document type", async () => {
      const { authHeader } = await createSystemAdminUser({
        email: "expiration-admin@example.com",
      });
      const existing = await createDocumentType({
        type: "passport",
        description: "Passport",
      });

      const create = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ orgId: (await createOrganization()).id, type: "diploma", description: "Diploma", hasExpirationDate: false });
      expect(create.status).toBe(200);

      const diploma = await request(app)
        .get(`/trips/document-types/${create.body.id}`)
        .set(authHeader);
      expect(diploma.status).toBe(200);
      expect(diploma.body.hasExpirationDate).toBe(false);

      const passport = await request(app)
        .get(`/trips/document-types/${existing.id}`)
        .set(authHeader);
      expect(passport.status).toBe(200);
      expect(passport.body.hasExpirationDate).toBe(true);
    });
  });

  describe("US-57.2 — Enter a document without an expiration date", () => {
    it("Document without an expiration date saves with none", async () => {
      const { authHeader, user } = await registerUser({
        email: "no-expiration-owner@example.com",
      });
      const diploma = await createDocumentType({
        type: "diploma",
        description: "Diploma",
        hasExpirationDate: false,
      });

      const withoutDate = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(diploma.id))
        .field("countryIssued", "US")
        .attach("document", TINY_PNG, { filename: "diploma.png", contentType: "image/png" });
      expect(withoutDate.status).toBe(200);
      expect(withoutDate.body.expirationDate).toBeNull();

      const withDate = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(diploma.id))
        .field("countryIssued", "US")
        .field("expirationDate", "2030-01-15")
        .attach("document", TINY_PNG, { filename: "diploma2.png", contentType: "image/png" });
      expect(withDate.status).toBe(200);
      expect(withDate.body.expirationDate).toBeNull();

      const stored = await db.personDocument.findByPk(withDate.body.id);
      expect(stored.expirationDate).toBeNull();
    });

    it("Expiration date is still required for a type that has one", async () => {
      const { authHeader, user } = await registerUser({
        email: "expiration-required-owner@example.com",
      });
      const passport = await createDocumentType({
        type: "passport",
        description: "Passport",
      });

      const response = await request(app)
        .post(`/trips/people/${user.personId}/documents`)
        .set(authHeader)
        .field("documentTypeId", String(passport.id))
        .field("countryIssued", "US")
        .attach("document", TINY_PNG, { filename: "passport.png", contentType: "image/png" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Expiration date is required.");
    });
  });

  describe("US-57.3 — Application document checks skip expiration for those types", () => {
    it("Required role document without an expiration date counts once uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "role-doc-expiration-admin@example.com",
      });
      const diploma = await createDocumentType({
        orgId: org.id,
        type: "diploma",
        description: "Diploma",
        hasExpirationDate: false,
      });
      const { trip, tripWorkerRole } = await createTripWithRole(authHeader, org.id, {
        name: "Diploma Role Trip",
        requiredDocumentTypeIds: [diploma.id],
      });
      const applicant = await registerUser({
        email: "role-doc-expiration-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);
      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: diploma.id,
        countryIssued: "US",
        expirationDate: null,
        documentFileName: "people/diploma.png",
      });

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send(applicationBody(tripWorkerRole.id, "Diploma Applicant"));

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });

    it("Passport type without an expiration date satisfies Require Passport", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "passport-expiration-admin@example.com",
      });
      const passport = await createDocumentType({
        type: "passport",
        description: "Passport Card",
        hasExpirationDate: false,
      });
      const { trip, tripWorkerRole } = await createTripWithRole(authHeader, org.id, {
        name: "Passport No Expiration Trip",
        requirePassport: true,
      });
      const applicant = await registerUser({
        email: "passport-expiration-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);
      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: passport.id,
        countryIssued: "US",
        expirationDate: null,
        documentFileName: "people/passport-card.png",
      });

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send(applicationBody(tripWorkerRole.id, "Passport Card Applicant"));

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });
  });
});
