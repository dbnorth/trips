/**
 * Feature 102 — Doctor Permission Document When Pregnant
 * Spec: features/feature-102-pregnancy-doctor-permission.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  completePersonProfile,
  TINY_PNG,
} from "./helpers.js";

const dateFromToday = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const applicationBody = (tripWorkerRoleId, { isPregnant = true } = {}) => ({
  tripWorkerRoleId,
  willSelfFund: true,
  flightPurchaseOption: "self",
  willRaiseFunds: false,
  hasPreferredRoommate: false,
  isPregnant,
  pregnancyDueDate: isPregnant ? "2027-06-01" : null,
  agreementAccepted: true,
  agreementSignatureName: "Ana Lopez",
});

/** Hope Mission, "Guatemala Clinic 2027" with one open role, and Ana Lopez (female, complete profile). */
const setup = async ({ startDate = "2027-03-01", endDate = "2027-03-10" } = {}) => {
  const admin = await createOrgAdminUser({ email: "hope-admin@example.com", orgName: "Hope Mission" });
  const trip = await request(app)
    .post("/trips/trips")
    .set(admin.authHeader)
    .send({
      orgId: admin.org.id,
      name: "Guatemala Clinic 2027",
      status: "active",
      startDate,
      endDate,
      participantCost: 1800,
    });
  expect(trip.status).toBe(200);
  const workerRole = await request(app)
    .post("/trips/worker-roles")
    .set(admin.authHeader)
    .send({ orgId: admin.org.id, name: "Nurse" });
  expect(workerRole.status).toBe(200);
  const tripWorkerRole = await request(app)
    .post("/trips/trip-worker-roles")
    .set(admin.authHeader)
    .send({ tripId: trip.body.id, workerRoleId: workerRole.body.id, quantity: 2 });
  expect(tripWorkerRole.status).toBe(200);

  const ana = await registerUser({
    email: "ana@example.com",
    firstName: "Ana",
    lastName: "Lopez",
    orgIds: [admin.org.id],
  });
  await completePersonProfile(ana.user.personId, { gender: "female" });

  return { admin, org: admin.org, trip: trip.body, tripWorkerRole: tripWorkerRole.body, ana };
};

const createDoctorPermissionType = (orgId, hasExpirationDate = false) =>
  db.documentType.create({
    orgId,
    type: "doctor_permission",
    description: "Doctor clearance letter",
    hasExpirationDate,
  });

const apply = (ana, tripId, body) =>
  request(app).post(`/trips/trips/browse/${tripId}/apply`).set(ana.authHeader).send(body);

const updateApplication = (ana, tripId, body) =>
  request(app).put(`/trips/trips/browse/${tripId}/application`).set(ana.authHeader).send(body);

describe("Feature 102 — Doctor Permission Document When Pregnant", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-102.1 — Staff set up a Doctor Permission document type", () => {
    it("Doctor Permission is a document type Type", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "types-admin@example.com" });

      const created = await request(app)
        .post("/trips/document-types")
        .set(authHeader)
        .send({ orgId: org.id, type: "doctor_permission", description: "Doctor clearance letter" });
      expect(created.status).toBe(200);
      expect(created.body.type).toBe("doctor_permission");

      const list = await request(app)
        .get("/trips/document-types")
        .query({ orgId: org.id })
        .set(authHeader);
      expect(list.status).toBe(200);
      expect(list.body.find((t) => t.id === created.body.id).type).toBe("doctor_permission");
    });
  });

  describe("US-102.2 — Pregnant applicants must upload a Doctor Permission document", () => {
    it("Pregnant applicant stays incomplete until the Doctor Permission document is uploaded", async () => {
      const { org, trip, tripWorkerRole, ana } = await setup();
      const type = await createDoctorPermissionType(org.id, false);

      const first = await apply(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(first.status).toBe(200);
      expect(first.body.applicationStatus).toBe("incomplete");

      const upload = await request(app)
        .post(`/trips/people/${ana.user.personId}/documents`)
        .set(ana.authHeader)
        .field("documentTypeId", String(type.id))
        .field("countryIssued", "US")
        .field("issueDate", "2026-10-15")
        .attach("document", TINY_PNG, { filename: "clearance.png", contentType: "image/png" });
      expect(upload.status).toBe(200);

      const second = await updateApplication(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(second.status).toBe(200);
      expect(second.body.application.status).toBe("applied");
    });

    it("A Doctor Permission document counts through its expiration date", async () => {
      const { org, trip, tripWorkerRole, ana } = await setup();
      const type = await createDoctorPermissionType(org.id, true);
      const doc = await db.personDocument.create({
        personId: ana.user.personId,
        documentTypeId: type.id,
        countryIssued: "US",
        expirationDate: "2027-03-05",
        documentFileName: "people/clearance.png",
      });

      const first = await apply(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(first.status).toBe(200);
      expect(first.body.applicationStatus).toBe("incomplete");

      await doc.update({ expirationDate: "2027-03-10" });
      const second = await updateApplication(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(second.status).toBe(200);
      expect(second.body.application.status).toBe("applied");
    });

    it("The application's upload expires at the trip end and a later trip needs a new one", async () => {
      const { admin, org, trip, tripWorkerRole, ana } = await setup();
      const type = await createDoctorPermissionType(org.id, false);
      await apply(ana, trip.id, applicationBody(tripWorkerRole.id));

      const upload = await request(app)
        .post(`/trips/people/${ana.user.personId}/documents`)
        .set(ana.authHeader)
        .field("documentTypeId", String(type.id))
        .field("countryIssued", "US")
        .field("issueDate", "2026-10-15")
        .field("expirationDate", "2027-03-10")
        .attach("document", TINY_PNG, { filename: "clearance.png", contentType: "image/png" });
      expect(upload.status).toBe(200);
      expect(String(upload.body.expirationDate).slice(0, 10)).toBe("2027-03-10");
      const stored = await db.personDocument.findByPk(upload.body.id);
      expect(String(stored.expirationDate).slice(0, 10)).toBe("2027-03-10");

      const saved = await updateApplication(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(saved.status).toBe(200);
      expect(saved.body.application.status).toBe("applied");

      const later = await request(app)
        .post("/trips/trips")
        .set(admin.authHeader)
        .send({
          orgId: org.id,
          name: "Honduras Clinic 2027",
          status: "active",
          startDate: "2027-05-01",
          endDate: "2027-05-10",
          participantCost: 1800,
        });
      const laterRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(admin.authHeader)
        .send({ tripId: later.body.id, workerRoleId: tripWorkerRole.workerRoleId, quantity: 2 });
      expect(laterRole.status).toBe(200);

      const laterApplication = await apply(ana, later.body.id, applicationBody(laterRole.body.id));
      expect(laterApplication.status).toBe(200);
      expect(laterApplication.body.applicationStatus).toBe("incomplete");
    });

    it("Not pregnant needs no Doctor Permission document", async () => {
      const { org, trip, tripWorkerRole, ana } = await setup();
      await createDoctorPermissionType(org.id);

      const response = await apply(ana, trip.id, applicationBody(tripWorkerRole.id, { isPregnant: false }));

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });

    it("An organization without a Doctor Permission type does not require one", async () => {
      const { trip, tripWorkerRole, ana } = await setup();

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      expect(browse.status).toBe(200);
      expect(browse.body.trip.requiresDoctorPermissionWhenPregnant).toBe(false);

      const response = await apply(ana, trip.id, applicationBody(tripWorkerRole.id));

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });

    it("Staff and My Trips see the missing document", async () => {
      const { admin, org, trip, tripWorkerRole, ana } = await setup({
        startDate: dateFromToday(60),
        endDate: dateFromToday(70),
      });
      await createDoctorPermissionType(org.id, true);

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      expect(browse.body.trip).toMatchObject({
        requiresDoctorPermissionWhenPregnant: true,
        doctorPermissionHasExpiration: true,
      });

      const applied = await apply(ana, trip.id, applicationBody(tripWorkerRole.id));
      expect(applied.body.applicationStatus).toBe("incomplete");

      const status = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);
      expect(status.status).toBe(200);
      const row = status.body.participants.find(
        (p) => Number(p.peopleId) === Number(ana.user.personId)
      );
      expect(row.missingItems).toContain("Doctor Permission document");

      const mine = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(ana.authHeader);
      expect(mine.status).toBe(200);
      const myTrip = mine.body.find((t) => Number(t.id) === Number(trip.id));
      expect(myTrip.nextActions).toEqual([
        { code: "complete-application", missingDocuments: ["Doctor Permission"] },
      ]);
    });
  });
});
