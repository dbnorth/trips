/**
 * Feature 7 — Trip Applications & Participants
 * Spec: features/feature-7-trip-applications-and-participants.md
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
  assignOrgRole,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const createActiveTripWithRole = async (
  adminAuth,
  orgId,
  { tripName = "Apply Trip", quantity = 5 } = {}
) => {
  const trip = await request(app)
    .post("/trips/trips")
    .set(adminAuth)
    .send({
      orgId,
      name: tripName,
      status: "active",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      participantCost: 1800,
    });
  expect(trip.status).toBe(200);

  const workerRole = await request(app)
    .post("/trips/worker-roles")
    .set(adminAuth)
    .send({
      orgId,
      name: "General Team",
      licenseRequired: false,
    });
  expect(workerRole.status).toBe(200);

  const tripWorkerRole = await request(app)
    .post("/trips/trip-worker-roles")
    .set(adminAuth)
    .send({
      tripId: trip.body.id,
      workerRoleId: workerRole.body.id,
      quantity,
    });
  expect(tripWorkerRole.status).toBe(200);

  return { trip: trip.body, workerRole: workerRole.body, tripWorkerRole: tripWorkerRole.body };
};

describe("Feature 7 — Trip Applications & Participants", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-7.1 — Browse and apply to trips", () => {
    it("Participant browses active trips and opens apply dialog", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "browse-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Browseable Trip",
      });
      const participant = await registerUser({
        email: "browser@example.com",
        firstName: "Bree",
        lastName: "Participant",
        orgIds: [org.id],
      });

      const list = await request(app)
        .get("/trips/trips/browse")
        .query({ orgId: org.id })
        .set(participant.authHeader);

      expect(list.status).toBe(200);
      expect(list.body.map((t) => t.id)).toContain(trip.id);

      const detail = await request(app)
        .get(`/trips/trips/browse/${trip.id}`)
        .set(participant.authHeader);

      expect(detail.status).toBe(200);
      expect(detail.body.trip).toMatchObject({
        id: trip.id,
        name: "Browseable Trip",
        status: "active",
      });
      expect(detail.body.rolesNeeded.map((r) => r.id)).toContain(tripWorkerRole.id);
      expect(detail.body.alreadyApplied).toBe(false);
    });
  });

  describe("US-7.2 — Save incomplete vs complete applications", () => {
    it("Incomplete application saves as incomplete", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "incomplete-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "incomplete-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: false,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("incomplete");
      expect(response.body.assignment.status).toBe("incomplete");
    });

    it("Complete application becomes applied", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "applied-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "applied-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Test Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
      expect(response.body.assignment.status).toBe("applied");
    });

    it("Application stays incomplete until all documents are uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "docs-gate-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "docs-gate-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const docType = await db.documentType.create({
        type: "passport",
        description: "Passport for gate test",
      });
      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: docType.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: null,
      });

      const incomplete = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Docs Gate Applicant",
        });

      expect(incomplete.status).toBe(200);
      expect(incomplete.body.applicationStatus).toBe("incomplete");
      expect(incomplete.body.assignment.status).toBe("incomplete");

      await db.personDocument.update(
        { documentFileName: "people/docs-gate-passport.png" },
        { where: { personId: applicant.user.personId } }
      );

      const applied = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Docs Gate Applicant",
          version: incomplete.body.assignment.version,
        });

      expect(applied.status).toBe(200);
      expect(applied.body.applicationStatus).toBe("applied");
      expect(applied.body.application.status).toBe("applied");
    });

    it("Application stays incomplete until role-required document is uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "role-doc-admin@example.com",
      });
      const docType = await db.documentType.create({
        type: "medical_licence",
        description: "RN License",
      });
      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Role Doc Trip",
          status: "active",
          startDate: "2026-09-01",
          endDate: "2026-09-14",
          participantCost: 1800,
        });
      expect(trip.status).toBe(200);

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Nurse",
          licenseRequired: true,
          requiredDocumentTypeIds: [docType.id],
        });
      expect(workerRole.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: trip.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 2,
        });
      expect(tripWorkerRole.status).toBe(200);

      const applicant = await registerUser({
        email: "role-doc-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const withoutDoc = await request(app)
        .post(`/trips/trips/browse/${trip.body.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          licenseStatus: "yes",
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Role Doc Applicant",
        });

      expect(withoutDoc.status).toBe(200);
      expect(withoutDoc.body.applicationStatus).toBe("incomplete");

      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: docType.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/rn-license.png",
      });

      const withDoc = await request(app)
        .put(`/trips/trips/browse/${trip.body.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          licenseStatus: "yes",
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Role Doc Applicant",
          version: withoutDoc.body.assignment.version,
        });

      expect(withDoc.status).toBe(200);
      expect(withDoc.body.applicationStatus).toBe("applied");
      expect(withDoc.body.application.status).toBe("applied");
    });

    it("Application stays incomplete until all role-required documents are uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "multi-role-docs-admin@example.com",
      });
      const typeA = await db.documentType.create({
        type: "medical_licence",
        description: "RN License",
      });
      const typeB = await db.documentType.create({
        type: "certification",
        description: "BLS",
      });
      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Multi Doc Role Trip",
          status: "active",
          startDate: "2026-09-01",
          endDate: "2026-09-14",
          participantCost: 1800,
        });
      expect(trip.status).toBe(200);

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Clinical",
          licenseRequired: false,
          requiredDocumentTypeIds: [typeA.id, typeB.id],
        });
      expect(workerRole.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: trip.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 2,
        });
      expect(tripWorkerRole.status).toBe(200);

      const applicant = await registerUser({
        email: "multi-role-docs-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: typeA.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/rn.png",
      });

      const incomplete = await request(app)
        .post(`/trips/trips/browse/${trip.body.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Multi Doc Applicant",
        });

      expect(incomplete.status).toBe(200);
      expect(incomplete.body.applicationStatus).toBe("incomplete");

      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: typeB.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/bls.png",
      });

      const applied = await request(app)
        .put(`/trips/trips/browse/${trip.body.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Multi Doc Applicant",
          version: incomplete.body.assignment.version,
        });

      expect(applied.status).toBe(200);
      expect(applied.body.applicationStatus).toBe("applied");
    });

    it("Role with no required documents does not block on this gate", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "no-role-docs-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "No Role Docs Trip",
      });
      const applicant = await registerUser({
        email: "no-role-docs-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const getRole = await request(app)
        .get(`/trips/worker-roles`)
        .query({ orgId: org.id })
        .set(authHeader);
      const role = getRole.body.find((r) => r.name === "General Team");
      expect(role?.requiredDocumentTypeIds || []).toEqual([]);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "No Role Docs Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });

    it("Application stays incomplete until passport is uploaded when required", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "passport-req-admin@example.com",
      });
      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Passport Required Trip",
          status: "active",
          startDate: "2026-09-01",
          endDate: "2026-09-14",
          participantCost: 1800,
          requirePassport: true,
        });
      expect(trip.status).toBe(200);

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "General Team",
          licenseRequired: false,
        });
      expect(workerRole.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: trip.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 5,
        });
      expect(tripWorkerRole.status).toBe(200);

      const applicant = await registerUser({
        email: "passport-req-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const withoutPassport = await request(app)
        .post(`/trips/trips/browse/${trip.body.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Passport Required Applicant",
        });

      expect(withoutPassport.status).toBe(200);
      expect(withoutPassport.body.applicationStatus).toBe("incomplete");

      const passportType = await db.documentType.create({
        type: "passport",
        description: "US Passport",
      });
      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: passportType.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/passport-required.png",
      });

      const withPassport = await request(app)
        .put(`/trips/trips/browse/${trip.body.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Passport Required Applicant",
          version: withoutPassport.body.assignment.version,
        });

      expect(withPassport.status).toBe(200);
      expect(withPassport.body.applicationStatus).toBe("applied");
      expect(withPassport.body.application.status).toBe("applied");
    });

    it("Passport is not required when Require Passport is unchecked", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "passport-optional-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "No Passport Required Trip",
      });
      const applicant = await registerUser({
        email: "passport-optional-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const storedTrip = await db.trip.findByPk(trip.id);
      expect(storedTrip.requirePassport).toBe(false);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Optional Passport Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
    });

    it("Pregnancy answers are saved on the application", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "preg-save-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "preg-save-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: true,
          pregnancyDueDate: "2026-11-15",
          agreementAccepted: true,
          agreementSignatureName: "Pregnant Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignment.isPregnant).toBe(true);
      expect(String(response.body.assignment.pregnancyDueDate).slice(0, 10)).toBe("2026-11-15");

      const stored = await db.tripPeopleRole.findByPk(response.body.assignment.id);
      expect(stored.isPregnant).toBe(true);
      expect(String(stored.pregnancyDueDate).slice(0, 10)).toBe("2026-11-15");
    });

    it("Organization flight purchase preferences are saved on the application", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "flight-pref-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "flight-pref-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const sys = await createSystemAdminUser({ email: "flight-pref-sys@example.com" });
      await request(app)
        .post("/trips/airports")
        .set(sys.authHeader)
        .send({ code: "DFW", airportName: "DFW", city: "Dallas", country: "US" });
      await request(app)
        .post("/trips/airports")
        .set(sys.authHeader)
        .send({ code: "AUS", airportName: "Austin", city: "Austin", country: "US" });
      await request(app)
        .post("/trips/airlines")
        .set(sys.authHeader)
        .send({ code: "AA", name: "American Airlines" });

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          flightPurchaseOption: "organization",
          preferredDepartureAirportCode: "DFW",
          preferredReturnAirportCode: "AUS",
          preferredCabinClass: "Economy",
          preferredAirlineCode: "AA",
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Flight Pref Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignment.flightPurchaseOption).toBe("organization");
      expect(response.body.assignment.preferredCabinClass).toBe("Economy");

      const stored = await db.tripPeopleRole.findByPk(response.body.assignment.id);
      expect(stored.flightPurchaseOption).toBe("organization");
      expect(stored.preferredCabinClass).toBe("Economy");
      expect(stored.preferredDepartureAirportId).toBeTruthy();
      expect(stored.preferredReturnAirportId).toBeTruthy();
      expect(stored.preferredAirlineId).toBeTruthy();
    });

    it("Due date is cleared when pregnant is No", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "preg-clear-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "preg-clear-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const created = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: true,
          pregnancyDueDate: "2026-11-15",
          agreementAccepted: true,
          agreementSignatureName: "Clear Due",
        });
      expect(created.status).toBe(200);

      const response = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Clear Due",
          version: created.body.assignment.version,
        });

      expect(response.status).toBe(200);
      expect(response.body.application.isPregnant).toBe(false);
      expect(response.body.application.pregnancyDueDate).toBeNull();
    });

    it("Pregnancy fields are cleared when gender is no longer female", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "preg-gender-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "preg-gender-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const created = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: true,
          pregnancyDueDate: "2026-11-15",
          agreementAccepted: true,
          agreementSignatureName: "Gender Change",
        });
      expect(created.status).toBe(200);

      await request(app)
        .put(`/trips/people/${applicant.user.personId}`)
        .set(applicant.authHeader)
        .send({ gender: "male" });

      const response = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: true,
          pregnancyDueDate: "2026-11-15",
          agreementAccepted: true,
          agreementSignatureName: "Gender Change",
          version: created.body.assignment.version,
        });

      expect(response.status).toBe(200);
      expect(response.body.application.isPregnant).toBeNull();
      expect(response.body.application.pregnancyDueDate).toBeNull();
    });

    it("Medical agreement acceptance is saved on the application", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "med-agree-admin@example.com",
      });
      await request(app)
        .put(`/trips/organizations/${org.id}/medical-agreement`)
        .set(authHeader)
        .send({ content: "# Medical\n\nTerms." });

      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "med-agree-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId, { takesMedication: true });

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          medicalAgreementAccepted: true,
          agreementSignatureName: "Med Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignment.medicalAgreementAccepted).toBe(true);
      expect(response.body.assignment.medicalAgreementDate).toBeTruthy();
    });

    it("Medical agreement acceptance is required when shown", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "med-req-admin@example.com",
      });
      await request(app)
        .put(`/trips/organizations/${org.id}/medical-agreement`)
        .set(authHeader)
        .send({ content: "# Medical\n\nRequired." });

      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({
        email: "med-req-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId, { takesMedication: true });

      const response = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          medicalAgreementAccepted: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("incomplete");
    });
  });

  describe("US-7.3 — Staff manage participants and applications", () => {
    it("Trip Leader approves an applied participant", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "approve-admin@example.com",
      });
      const leader = await registerUser({
        email: "approve-leader@example.com",
        firstName: "Lee",
        lastName: "Leader",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Approve Trip",
          status: "active",
          startDate: "2026-10-01",
          endDate: "2026-10-10",
          participantCost: 1500,
          leaderPeopleIds: [leader.user.personId],
        });
      expect(trip.status).toBe(200);

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({ orgId: org.id, name: "Helper", licenseRequired: false });
      expect(workerRole.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: trip.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 3,
        });
      expect(tripWorkerRole.status).toBe(200);

      const applicant = await registerUser({
        email: "to-approve@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.body.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "To Approve",
        });
      expect(apply.status).toBe(200);
      expect(apply.body.applicationStatus).toBe("applied");

      const approve = await request(app)
        .put(`/trips/trip-people-roles/${apply.body.assignment.id}`)
        .set(leader.authHeader)
        .send({
          version: apply.body.assignment.version,
          status: "approved",
        });

      expect(approve.status).toBe(200);
      expect(approve.body.status).toBe("approved");
    });

    it("Trip Leader adds an existing person to the roster", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "roster-admin@example.com",
      });
      const leader = await registerUser({
        email: "roster-leader@example.com",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Roster Trip",
          status: "active",
          startDate: "2026-11-01",
          endDate: "2026-11-08",
          participantCost: 1200,
          leaderPeopleIds: [leader.user.personId],
        });
      expect(trip.status).toBe(200);

      const member = await registerUser({
        email: "roster-member@example.com",
        firstName: "Roster",
        lastName: "Member",
        orgIds: [org.id],
      });
      const participantRole = await findRole("Trip Participant");

      const create = await request(app)
        .post("/trips/trip-people-roles")
        .set(leader.authHeader)
        .send({
          tripId: trip.body.id,
          peopleId: member.user.personId,
          roleId: participantRole.id,
          status: "approved",
        });

      expect(create.status).toBe(200);
      expect(create.body).toMatchObject({
        tripId: trip.body.id,
        peopleId: member.user.personId,
        status: "approved",
      });

      const stored = await db.tripPeopleRole.findOne({
        where: { tripId: trip.body.id, peopleId: member.user.personId },
      });
      expect(stored).not.toBeNull();
    });
  });

  describe("US-7.4 — Export participants CSV", () => {
    it("Staff downloads participants CSV", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "csv-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "CSV Trip",
      });
      const applicant = await registerUser({
        email: "csv-participant@example.com",
        firstName: "Csv",
        lastName: "Person",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Csv Person",
        });
      expect(apply.status).toBe(200);

      const csv = await request(app)
        .get(`/trips/export/trips/${trip.id}/participants.csv`)
        .set(authHeader);

      expect(csv.status).toBe(200);
      expect(csv.headers["content-type"]).toMatch(/text\/csv/);
      expect(csv.text).toMatch(/First Name/);
      expect(csv.text).toMatch(/Csv/);
      expect(csv.text).toMatch(/Person/);
    });
  });

  /**
   * Feature 26 — Role Capacity & Application Cancel / Uncancel
   * Spec: features/feature-26-role-capacity-and-cancel.md
   */
  describe("Feature 26 — Role Capacity & Application Cancel / Uncancel", () => {
  describe("US-26.1 — Role slots consumed by pending and submitted applications", () => {
    it("Incomplete application occupies a role slot", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "cap-incomplete-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Capacity Incomplete",
        quantity: 1,
      });
      const personA = await registerUser({
        email: "cap-incomplete-a@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personA.user.personId);
      const personB = await registerUser({
        email: "cap-incomplete-b@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personB.user.personId);

      const applyA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personA.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: false,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
        });
      expect(applyA.status).toBe(200);
      expect(applyA.body.applicationStatus).toBe("incomplete");

      const browse = await request(app)
        .get(`/trips/trips/browse/${trip.id}`)
        .set(personB.authHeader);
      expect(browse.status).toBe(200);
      const role = (browse.body.rolesNeeded || []).find((r) => Number(r.id) === Number(tripWorkerRole.id));
      expect(role?.availableCount).toBe(0);

      const applyB = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personB.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person B",
        });
      expect(applyB.status).toBe(400);
      expect(applyB.body.message).toMatch(/no available|full|available/i);
    });

    it("Applied application occupies a role slot", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "cap-applied-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Capacity Applied",
        quantity: 1,
      });
      const personA = await registerUser({
        email: "cap-applied-a@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personA.user.personId);
      const personB = await registerUser({
        email: "cap-applied-b@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personB.user.personId);

      const applyA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personA.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person A",
        });
      expect(applyA.status).toBe(200);
      expect(applyA.body.applicationStatus).toBe("applied");

      const applyB = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personB.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person B",
        });
      expect(applyB.status).toBe(400);
    });

    it("Cancelled application does not occupy a role slot", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "cap-cancel-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Capacity Cancelled",
        quantity: 1,
      });
      const personA = await registerUser({
        email: "cap-cancel-a@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personA.user.personId);
      const personB = await registerUser({
        email: "cap-cancel-b@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personB.user.personId);

      const applyA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personA.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person A",
        });
      expect(applyA.status).toBe(200);

      const cancelA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/cancel`)
        .set(personA.authHeader);
      expect(cancelA.status).toBe(200);
      expect(cancelA.body.applicationStatus).toBe("cancelled");

      const applyB = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personB.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person B",
        });
      expect(applyB.status).toBe(200);
      expect(applyB.body.applicationStatus).toBe("applied");
    });
  });

  describe("US-26.2 — Cancel and Uncancel an application", () => {
    it("Applicant cancels an application", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "cancel-self-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Cancel Self",
        quantity: 1,
      });
      const applicant = await registerUser({
        email: "cancel-self@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: false,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
        });
      expect(apply.status).toBe(200);
      expect(apply.body.applicationStatus).toBe("incomplete");

      const cancel = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/cancel`)
        .set(applicant.authHeader);
      expect(cancel.status).toBe(200);
      expect(cancel.body.applicationStatus).toBe("cancelled");

      const mine = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(applicant.authHeader);
      expect(mine.status).toBe(200);
      const cancelledTrip = (mine.body || []).find((t) => Number(t.id) === Number(trip.id));
      expect(cancelledTrip).toBeTruthy();
      expect(cancelledTrip.applicationStatus).toBe("cancelled");

      const browse = await request(app)
        .get(`/trips/trips/browse/${trip.id}`)
        .set(applicant.authHeader);
      const role = (browse.body.rolesNeeded || []).find((r) => Number(r.id) === Number(tripWorkerRole.id));
      expect(role?.availableCount).toBe(1);
    });

    it("Applicant uncancels when a slot is free", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "uncancel-self-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Uncancel Self",
        quantity: 1,
      });
      const applicant = await registerUser({
        email: "uncancel-self@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Uncancel Self",
        });
      expect(apply.status).toBe(200);
      expect(apply.body.applicationStatus).toBe("applied");

      await request(app)
        .put(`/trips/trip-people-roles/${apply.body.assignment.id}`)
        .set(authHeader)
        .send({ version: apply.body.assignment.version, status: "approved" });

      const cancel = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/cancel`)
        .set(applicant.authHeader);
      expect(cancel.status).toBe(200);

      const uncancel = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/uncancel`)
        .set(applicant.authHeader);
      expect(uncancel.status).toBe(200);
      expect(["incomplete", "applied"]).toContain(uncancel.body.applicationStatus);
      expect(uncancel.body.applicationStatus).not.toBe("approved");
    });

    it("Uncancel is blocked when the role is full", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "uncancel-full-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Uncancel Full",
        quantity: 1,
      });
      const personA = await registerUser({
        email: "uncancel-full-a@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personA.user.personId);
      const personB = await registerUser({
        email: "uncancel-full-b@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(personB.user.personId);

      const applyA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personA.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person A",
        });
      expect(applyA.status).toBe(200);

      const cancelA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/cancel`)
        .set(personA.authHeader);
      expect(cancelA.status).toBe(200);

      const applyB = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personB.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Person B",
        });
      expect(applyB.status).toBe(200);

      const uncancelA = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/uncancel`)
        .set(personA.authHeader);
      expect(uncancelA.status).toBe(400);

      const stored = await db.tripPeopleRole.findOne({
        where: { tripId: trip.id, peopleId: personA.user.personId },
      });
      expect(stored.status).toBe("cancelled");
    });

    it("Trip Leader or Admin can cancel and uncancel", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "staff-cancel-admin@example.com",
      });
      const leader = await registerUser({
        email: "staff-cancel-leader@example.com",
        orgIds: [org.id],
      });
      await assignOrgRole(org.id, leader.user.personId, "Trip Leader");

      const trip = await request(app)
        .post("/trips/trips")
        .set(authHeader)
        .send({
          orgId: org.id,
          name: "Staff Cancel Trip",
          status: "active",
          startDate: "2026-10-01",
          endDate: "2026-10-10",
          participantCost: 1500,
          leaderPeopleIds: [leader.user.personId],
        });
      expect(trip.status).toBe(200);

      const workerRole = await request(app)
        .post("/trips/worker-roles")
        .set(authHeader)
        .send({ orgId: org.id, name: "Staff Role", licenseRequired: false });
      expect(workerRole.status).toBe(200);

      const tripWorkerRole = await request(app)
        .post("/trips/trip-worker-roles")
        .set(authHeader)
        .send({
          tripId: trip.body.id,
          workerRoleId: workerRole.body.id,
          quantity: 1,
        });
      expect(tripWorkerRole.status).toBe(200);

      const applicant = await registerUser({
        email: "staff-cancel-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const apply = await request(app)
        .post(`/trips/trips/browse/${trip.body.id}/apply`)
        .set(applicant.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.body.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Staff Cancel App",
        });
      expect(apply.status).toBe(200);

      const cancel = await request(app)
        .post(`/trips/trip-people-roles/${apply.body.assignment.id}/cancel`)
        .set(leader.authHeader);
      expect(cancel.status).toBe(200);
      expect(cancel.body.status).toBe("cancelled");

      const uncancel = await request(app)
        .post(`/trips/trip-people-roles/${apply.body.assignment.id}/uncancel`)
        .set(leader.authHeader);
      expect(uncancel.status).toBe(200);
      expect(["incomplete", "applied"]).toContain(uncancel.body.status);
      expect(uncancel.body.status).not.toBe("approved");
    });
  });
  });
});
