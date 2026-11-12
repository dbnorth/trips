/**
 * Feature 7 — Trip Applications & Participants
 * Spec: features/feature-7-trip-applications-and-participants.md
 * Feature 95 — Role Availability on Public Trip Pages
 * Spec: features/feature-95-public-trip-role-availability.md
 * Feature 125 — Participant Why Go
 * Spec: features/feature-125-participant-why-go.md
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
  createDocumentType,
  createTripWorkerRole,
  COMPLETE_APPLICATION,
} from "./helpers.js";

const APPROVAL_DOCUMENTS_MESSAGE = "Upload and review all required documents before approving.";

const approveApplication = async (adminAuth, assignmentId) => {
  const row = await db.tripPeopleRole.findByPk(assignmentId);
  return request(app)
    .put(`/trips/trip-people-roles/${assignmentId}`)
    .set(adminAuth)
    .send({ status: "approved", version: row.version });
};

const markDocumentsReviewed = (personId) =>
  db.personDocument.update({ reviewed: true }, { where: { personId } });

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
      expect(response.body.applicationStatus).toBe("pre_approved");
      expect(response.body.assignment.status).toBe("pre_approved");
    });

    it("Approval waits until all documents are uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "docs-gate-admin@example.com",
      });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      // Only documents the trip requires need a file (Feature 122).
      await db.trip.update({ requirePassport: true }, { where: { id: trip.id } });
      const applicant = await registerUser({
        email: "docs-gate-app@example.com",
        orgIds: [org.id],
      });
      await completePersonProfile(applicant.user.personId);

      const docType = await createDocumentType({
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
      expect(incomplete.body.applicationStatus).toBe("pre_approved");

      const refused = await approveApplication(authHeader, incomplete.body.assignment.id);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe(APPROVAL_DOCUMENTS_MESSAGE);

      await db.personDocument.update(
        { documentFileName: "people/docs-gate-passport.png", reviewed: true },
        { where: { personId: applicant.user.personId } }
      );

      const approved = await approveApplication(authHeader, incomplete.body.assignment.id);
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe("approved");
    });

    it("Approval waits until the role-required document is uploaded and reviewed", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "role-doc-admin@example.com",
      });
      const docType = await createDocumentType({
        orgId: org.id,
        type: "medical_license",
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
      expect(withoutDoc.body.applicationStatus).toBe("pre_approved");
      const assignmentId = withoutDoc.body.assignment.id;
      expect((await approveApplication(authHeader, assignmentId)).status).toBe(400);

      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: docType.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/rn-license.png",
      });
      expect((await approveApplication(authHeader, assignmentId)).status).toBe(400);

      await markDocumentsReviewed(applicant.user.personId);
      const approved = await approveApplication(authHeader, assignmentId);
      expect(approved.status).toBe(200);
      expect(approved.body.status).toBe("approved");
    });

    it("Approval waits until all role-required documents are uploaded", async () => {
      const { authHeader, org } = await createOrgAdminUser({
        email: "multi-role-docs-admin@example.com",
      });
      const typeA = await createDocumentType({
        orgId: org.id,
        type: "medical_license",
        description: "RN License",
      });
      const typeB = await createDocumentType({
        orgId: org.id,
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
      expect(incomplete.body.applicationStatus).toBe("pre_approved");
      await markDocumentsReviewed(applicant.user.personId);
      const assignmentId = incomplete.body.assignment.id;
      expect((await approveApplication(authHeader, assignmentId)).status).toBe(400);

      await db.personDocument.create({
        personId: applicant.user.personId,
        documentTypeId: typeB.id,
        countryIssued: "US",
        issueDate: "2020-01-01",
        expirationDate: "2030-01-01",
        documentFileName: "people/bls.png",
        reviewed: true,
      });

      expect((await approveApplication(authHeader, assignmentId)).status).toBe(200);
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
      expect(response.body.applicationStatus).toBe("pre_approved");
    });

    it("Approval waits until the passport is uploaded when required", async () => {
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
      expect(withoutPassport.body.applicationStatus).toBe("pre_approved");
      const assignmentId = withoutPassport.body.assignment.id;
      expect((await approveApplication(authHeader, assignmentId)).status).toBe(400);

      const passportType = await createDocumentType({
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
        reviewed: true,
      });

      expect((await approveApplication(authHeader, assignmentId)).status).toBe(200);
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
      expect(response.body.applicationStatus).toBe("pre_approved");
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
          preferredRefundableTicket: true,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Flight Pref Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.assignment.flightPurchaseOption).toBe("organization");
      expect(response.body.assignment.preferredCabinClass).toBe("Economy");
      expect(response.body.assignment.preferredRefundableTicket).toBe(true);

      const stored = await db.tripPeopleRole.findByPk(response.body.assignment.id);
      expect(stored.flightPurchaseOption).toBe("organization");
      expect(stored.preferredCabinClass).toBe("Economy");
      expect(stored.preferredRefundableTicket).toBe(true);
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
        .send({ orgId: org.id, name: "Helper" });
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
      expect(apply.body.applicationStatus).toBe("pre_approved");

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
      await completePersonProfile(member.user.personId);
      const participantRole = await findRole("Trip Participant");
      const tripWorkerRole = await createTripWorkerRole(trip.body.id, org.id);

      const create = await request(app)
        .post("/trips/trip-people-roles")
        .set(leader.authHeader)
        .send({
          ...COMPLETE_APPLICATION,
          tripId: trip.body.id,
          peopleId: member.user.personId,
          roleId: participantRole.id,
          tripWorkerRoleId: tripWorkerRole.id,
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
      expect(role?.signedUpCount).toBe(0);
      expect(role?.availableCount).toBe(1);

      const applyB = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personB.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: false,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
        });
      expect(applyB.status).toBe(200);
      expect(applyB.body.applicationStatus).toBe("incomplete");
      const again = await request(app).get(`/trips/trips/browse/${trip.id}`).set(personB.authHeader);
      const stillOpen = (again.body.rolesNeeded || []).find((r) => Number(r.id) === Number(tripWorkerRole.id));
      expect(stillOpen?.availableCount).toBe(1);
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
      expect(applyA.body.applicationStatus).toBe("pre_approved");

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
      expect(applyB.body.applicationStatus).toBe("pre_approved");
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
      expect(apply.body.applicationStatus).toBe("pre_approved");

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
      expect(["incomplete", "pre_approved"]).toContain(uncancel.body.applicationStatus);
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
        .send({ orgId: org.id, name: "Staff Role" });
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
      expect(["incomplete", "pre_approved"]).toContain(uncancel.body.status);
      expect(uncancel.body.status).not.toBe("approved");
    });
  });
  });

  /**
   * Feature 84 — Application Flight Notes
   * Spec: features/feature-84-application-flight-notes.md
   */
  describe("Feature 84 — US-84.2 Participants and staff see and edit flight notes", () => {
    it("A participant saves flight notes on the application", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "notes-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const ana = await registerUser({ email: "ana-notes@example.com", orgIds: [org.id] });
      const application = (flightNotes) => ({
        tripWorkerRoleId: tripWorkerRole.id,
        willSelfFund: true,
        willRaiseFunds: false,
        flightPurchaseOption: "self",
        hasPreferredRoommate: false,
        ...(flightNotes === undefined ? {} : { flightNotes }),
      });

      const created = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(ana.authHeader)
        .send(application("  Flying from Columbus  "));
      expect(created.status).toBe(200);
      expect(created.body.assignment.flightNotes).toBe("Flying from Columbus");

      const updated = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(ana.authHeader)
        .send(application("Flying from Nashville, back to Memphis"));
      expect(updated.status).toBe(200);
      expect(updated.body.application.flightNotes).toBe("Flying from Nashville, back to Memphis");

      const withoutNotes = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(ana.authHeader)
        .send(application(undefined));
      expect(withoutNotes.body.application.flightNotes).toBe("Flying from Nashville, back to Memphis");

      const cleared = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(ana.authHeader)
        .send(application(""));
      expect(cleared.body.application.flightNotes).toBeNull();

      const fetched = await request(app).get(`/trips/trips/browse/${trip.id}/application`).set(ana.authHeader);
      expect(fetched.body.application.flightNotes).toBeNull();
    });
  });

  /**
   * Feature 125 — Participant Why Go
   * Spec: features/feature-125-participant-why-go.md
   */
  describe("Feature 125 — Participant Why Go", () => {
    const setupApplicant = async (prefix) => {
      const { authHeader, org } = await createOrgAdminUser({ email: `${prefix}-admin@example.com` });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id);
      const applicant = await registerUser({ email: `${prefix}-app@example.com`, orgIds: [org.id] });
      const application = (fields = {}) => ({
        tripWorkerRoleId: tripWorkerRole.id,
        willSelfFund: false,
        willRaiseFunds: true,
        flightPurchaseOption: "self",
        hasPreferredRoommate: false,
        ...fields,
      });
      return { adminAuth: authHeader, org, trip, tripWorkerRole, applicant, application };
    };

    const findAssignment = (tripId, personId) =>
      db.tripPeopleRole.findOne({ where: { tripId, peopleId: personId } });

    describe("US-125.1 — Tell donors why I'm going", () => {
      it("Participant saves Why go on the application", async () => {
        const { trip, applicant, application } = await setupApplicant("whygo-save");

        const created = await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "  I want to serve.  " }));
        expect(created.status).toBe(200);
        expect(created.body.assignment.whygoText).toBe("I want to serve.");

        const fetched = await request(app)
          .get(`/trips/trips/browse/${trip.id}/application`)
          .set(applicant.authHeader);
        expect(fetched.body.application.whygoText).toBe("I want to serve.");

        const unchanged = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application`)
          .set(applicant.authHeader)
          .send(application());
        expect(unchanged.status).toBe(200);
        expect(unchanged.body.application.whygoText).toBe("I want to serve.");

        const cleared = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "   " }));
        expect(cleared.status).toBe(200);
        expect(cleared.body.application.whygoText).toBeNull();
      });

      it("Why go must be 2000 characters or less", async () => {
        const { trip, applicant, application } = await setupApplicant("whygo-long");
        const message = "Why go must be 2000 characters or less.";

        const tooLong = await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "a".repeat(2001) }));
        expect(tooLong.status).toBe(400);
        expect(tooLong.body.message).toBe(message);

        const atLimit = await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "a".repeat(2000) }));
        expect(atLimit.status).toBe(200);

        const update = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "b".repeat(2001) }));
        expect(update.status).toBe(400);
        expect(update.body.message).toBe(message);

        const whyGo = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application/why-go`)
          .set(applicant.authHeader)
          .send({ whygoText: "c".repeat(2001) });
        expect(whyGo.status).toBe(400);
        expect(whyGo.body.message).toBe(message);

        const stored = await findAssignment(trip.id, applicant.user.personId);
        expect(stored.whygoText).toBe("a".repeat(2000));
      });
    });

    describe("US-125.2 — Update my story after approval", () => {
      it("Approved participant updates Why go", async () => {
        const { trip, applicant, application } = await setupApplicant("whygo-approved");
        await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "First story", flightNotes: "Window seat" }));
        const assignment = await findAssignment(trip.id, applicant.user.personId);
        await assignment.update({ status: "approved" });
        const before = await findAssignment(trip.id, applicant.user.personId);

        const saved = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application/why-go`)
          .set(applicant.authHeader)
          .send({ whygoText: "  New story  " });
        expect(saved.status).toBe(200);
        expect(saved.body).toEqual({ message: "Why go saved.", whygoText: "New story" });

        const after = await findAssignment(trip.id, applicant.user.personId);
        expect(after.whygoText).toBe("New story");
        expect(after.status).toBe("approved");
        expect(after.flightNotes).toBe("Window seat");
        expect(after.willRaiseFunds).toBe(true);
        expect(after.version).toBe(before.version);
      });

      it("Why go can't be changed on a cancelled application", async () => {
        const { trip, applicant, application } = await setupApplicant("whygo-cancelled");
        await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "Kept story" }));
        const assignment = await findAssignment(trip.id, applicant.user.personId);
        await assignment.update({ status: "cancelled" });

        const refused = await request(app)
          .put(`/trips/trips/browse/${trip.id}/application/why-go`)
          .set(applicant.authHeader)
          .send({ whygoText: "Changed" });
        expect(refused.status).toBe(400);
        expect(refused.body.message).toBe("This application cannot be updated while its status is cancelled.");
        expect((await findAssignment(trip.id, applicant.user.personId)).whygoText).toBe("Kept story");
      });
    });

    describe("US-125.3 — Staff no longer edit Why go", () => {
      it("Staff update leaves Why go unchanged", async () => {
        const { adminAuth, trip, applicant, application } = await setupApplicant("whygo-staff");
        await request(app)
          .post(`/trips/trips/browse/${trip.id}/apply`)
          .set(applicant.authHeader)
          .send(application({ whygoText: "My story" }));
        const assignment = await findAssignment(trip.id, applicant.user.personId);

        const update = await request(app)
          .put(`/trips/trip-people-roles/${assignment.id}`)
          .set(adminAuth)
          .send({ whygoText: "Staff text", participantCost: 1900, version: assignment.version });
        expect(update.status).toBe(200);

        const after = await findAssignment(trip.id, applicant.user.personId);
        expect(after.whygoText).toBe("My story");
        expect(Number(after.participantCost)).toBe(1900);
      });

      it("Add participant still saves Why go", async () => {
        const { adminAuth, org, trip, tripWorkerRole } = await setupApplicant("whygo-add");
        const member = await registerUser({ email: "whygo-member@example.com", orgIds: [org.id] });
        const participantRole = await findRole("Trip Participant");

        const create = await request(app)
          .post("/trips/trip-people-roles")
          .set(adminAuth)
          .send({
            tripId: trip.id,
            peopleId: member.user.personId,
            roleId: participantRole.id,
            tripWorkerRoleId: tripWorkerRole.id,
            whygoText: " Starting story ",
          });
        expect(create.status).toBe(200);
        expect(create.body.whygoText).toBe("Starting story");

        const tooLong = await request(app)
          .post("/trips/trip-people-roles")
          .set(adminAuth)
          .send({
            tripId: trip.id,
            peopleId: (await registerUser({ email: "whygo-member2@example.com", orgIds: [org.id] })).user.personId,
            roleId: participantRole.id,
            tripWorkerRoleId: tripWorkerRole.id,
            whygoText: "a".repeat(2001),
          });
        expect(tooLong.status).toBe(400);
        expect(tooLong.body.message).toBe("Why go must be 2000 characters or less.");
      });
    });
  });

  /**
   * Feature 95 — Role Availability on Public Trip Pages
   * Spec: features/feature-95-public-trip-role-availability.md
   */
  describe("Feature 95 — US-95.1 Visitors see how many positions are open before applying", () => {
    it("Browse trips include role availability", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "availability-admin@example.com" });
      const { trip, tripWorkerRole: nurse } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Clinica Ezell Hospital - January 2027",
        quantity: 4,
      });
      const doctor = await db.tripWorkerRole.create({
        tripId: trip.id,
        workerRoleId: (await db.workerRole.create({ orgId: org.id, name: "Doctor" })).id,
        quantity: 2,
      });
      const participant = await findRole("Trip Participant");
      const signUp = async (role, email, status) => {
        const { user } = await registerUser({ email, firstName: "Pat", lastName: "Person", orgIds: [org.id] });
        await db.tripPeopleRole.create({
          tripId: trip.id,
          peopleId: user.personId,
          roleId: participant.id,
          tripWorkerRoleId: role.id,
          status,
        });
      };
      await signUp(nurse, "nurse1@example.com", "pre_approved");
      await signUp(nurse, "nurse2@example.com", "approved");
      await signUp(nurse, "nurse-cancelled@example.com", "cancelled");
      await signUp(doctor, "doctor1@example.com", "incomplete");
      await db.tripWorkerRoleReservation.create({ tripId: trip.id, tripWorkerRoleId: nurse.id, email: "ana@example.com" });
      await db.tripWorkerRoleReservation.create({ tripId: trip.id, tripWorkerRoleId: doctor.id, email: "cy@example.com" });
      const ben = await registerUser({ email: "ben@example.com", firstName: "Ben", lastName: "Baker", orgIds: [org.id] });
      const ana = await registerUser({ email: "ana@example.com", firstName: "Ana", lastName: "Lopez", orgIds: [org.id] });
      const browseFor = async (person) => {
        const list = await request(app).get("/trips/trips/browse").query({ orgId: org.id }).set(person.authHeader);
        expect(list.status).toBe(200);
        return list.body.find((t) => t.id === trip.id);
      };

      const forBen = await browseFor(ben);
      expect(forBen.roleAvailability).toEqual({ reserved: 2, open: 2 });
      expect(forBen.myReservedTripWorkerRoleId).toBeNull();
      const forAna = await browseFor(ana);
      expect(forAna.roleAvailability).toEqual({ reserved: 2, open: 2 });
      expect(forAna.myReservedTripWorkerRoleId).toBe(nurse.id);
    });
  });

  describe("Feature 129 — US-129.2 Only a submitted application holds a role spot", () => {
    const incompleteBody = (roleId) => ({
      tripWorkerRoleId: roleId,
      willSelfFund: false,
      willRaiseFunds: false,
      flightPurchaseOption: "self",
    });

    const countsFor = async (authHeader, tripId, roleId) => {
      const browse = await request(app).get(`/trips/trips/browse/${tripId}`).set(authHeader);
      const role = (browse.body.rolesNeeded || []).find((r) => Number(r.id) === Number(roleId));
      return {
        signedUpCount: role?.signedUpCount,
        availableCount: role?.availableCount,
        reservedCount: role?.reservedCount,
      };
    };

    const applyIncomplete = (authHeader, tripId, roleId) =>
      request(app).post(`/trips/trips/browse/${tripId}/apply`).set(authHeader).send(incompleteBody(roleId));

    it("Incomplete applications leave the spot open", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "hold-open-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Open",
        quantity: 1,
      });
      const personA = await registerUser({ email: "hold-open-a@example.com", orgIds: [org.id] });
      const personB = await registerUser({ email: "hold-open-b@example.com", orgIds: [org.id] });

      expect((await applyIncomplete(personA.authHeader, trip.id, tripWorkerRole.id)).status).toBe(200);
      expect((await applyIncomplete(personB.authHeader, trip.id, tripWorkerRole.id)).status).toBe(200);

      expect(await countsFor(authHeader, trip.id, tripWorkerRole.id)).toEqual({
        signedUpCount: 0,
        availableCount: 1,
        reservedCount: 0,
      });
    });

    it("The first submit holds the spot", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "hold-submit-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Submit",
        quantity: 1,
      });
      const personA = await registerUser({ email: "hold-submit-a@example.com", orgIds: [org.id] });
      const personB = await registerUser({ email: "hold-submit-b@example.com", orgIds: [org.id] });
      await completePersonProfile(personA.user.personId);
      await completePersonProfile(personB.user.personId);
      const applyA = await applyIncomplete(personA.authHeader, trip.id, tripWorkerRole.id);
      const applyB = await applyIncomplete(personB.authHeader, trip.id, tripWorkerRole.id);
      expect(applyA.status).toBe(200);
      expect(applyB.status).toBe(200);

      const submitA = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(personA.authHeader)
        .send({
          ...COMPLETE_APPLICATION,
          tripWorkerRoleId: tripWorkerRole.id,
          willRaiseFunds: false,
          version: applyA.body.assignment.version,
        });
      expect(submitA.status).toBe(200);
      expect(submitA.body.applicationStatus).toBe("pre_approved");
      expect(await countsFor(authHeader, trip.id, tripWorkerRole.id)).toMatchObject({
        signedUpCount: 1,
        availableCount: 0,
      });

      const submitB = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(personB.authHeader)
        .send({
          ...COMPLETE_APPLICATION,
          tripWorkerRoleId: tripWorkerRole.id,
          willRaiseFunds: false,
          version: applyB.body.assignment.version,
        });
      expect(submitB.status).toBe(400);
      expect(submitB.body.message).toBe("That trip role has no available positions.");
      const still = await db.tripPeopleRole.findOne({ where: { peopleId: personB.user.personId, tripId: trip.id } });
      expect(still.status).toBe("incomplete");
    });

    it("Updating a held role does not need another spot", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "hold-update-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Update",
        quantity: 1,
      });
      const personA = await registerUser({ email: "hold-update-a@example.com", orgIds: [org.id] });
      await completePersonProfile(personA.user.personId);
      const applied = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(personA.authHeader)
        .send({ ...COMPLETE_APPLICATION, tripWorkerRoleId: tripWorkerRole.id, willRaiseFunds: false });
      expect(applied.body.applicationStatus).toBe("pre_approved");
      expect((await countsFor(authHeader, trip.id, tripWorkerRole.id)).availableCount).toBe(0);

      const updated = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(personA.authHeader)
        .send({
          ...COMPLETE_APPLICATION,
          tripWorkerRoleId: tripWorkerRole.id,
          willRaiseFunds: false,
          agreementSignatureName: "Pat Lee Updated",
          version: applied.body.assignment.version,
        });
      expect(updated.status).toBe(200);
      expect(updated.body.applicationStatus).toBe("pre_approved");
    });

    it("Uncancel holds a spot only when it comes back submitted", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "hold-uncancel-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Uncancel",
        quantity: 1,
      });
      const submitted = await registerUser({ email: "hold-uncancel-full@example.com", orgIds: [org.id] });
      const incomplete = await registerUser({ email: "hold-uncancel-open@example.com", orgIds: [org.id] });
      const holder = await registerUser({ email: "hold-uncancel-holder@example.com", orgIds: [org.id] });
      await completePersonProfile(submitted.user.personId);
      await completePersonProfile(holder.user.personId);

      const fullApply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(submitted.authHeader)
        .send({ ...COMPLETE_APPLICATION, tripWorkerRoleId: tripWorkerRole.id, willRaiseFunds: false });
      expect(fullApply.body.applicationStatus).toBe("pre_approved");
      expect(
        (await request(app).post(`/trips/trips/browse/${trip.id}/application/cancel`).set(submitted.authHeader)).status
      ).toBe(200);

      const holderApply = await request(app)
        .post(`/trips/trips/browse/${trip.id}/apply`)
        .set(holder.authHeader)
        .send({ ...COMPLETE_APPLICATION, tripWorkerRoleId: tripWorkerRole.id, willRaiseFunds: false });
      expect(holderApply.body.applicationStatus).toBe("pre_approved");

      expect((await applyIncomplete(incomplete.authHeader, trip.id, tripWorkerRole.id)).status).toBe(200);
      expect(
        (await request(app).post(`/trips/trips/browse/${trip.id}/application/cancel`).set(incomplete.authHeader)).status
      ).toBe(200);
      const uncancelIncomplete = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/uncancel`)
        .set(incomplete.authHeader);
      expect(uncancelIncomplete.status).toBe(200);
      expect(uncancelIncomplete.body.applicationStatus).toBe("incomplete");
      expect(await countsFor(authHeader, trip.id, tripWorkerRole.id)).toMatchObject({
        signedUpCount: 1,
        availableCount: 0,
      });

      const uncancelSubmitted = await request(app)
        .post(`/trips/trips/browse/${trip.id}/application/uncancel`)
        .set(submitted.authHeader);
      expect(uncancelSubmitted.status).toBe(400);
      expect(uncancelSubmitted.body.message).toBe("This role is full. Uncancel is not available.");
    });

    it("Only submitted applications block removing a role", async () => {
      const { authHeader, org } = await createOrgAdminUser({ email: "hold-remove-admin@example.com" });
      const { trip, tripWorkerRole } = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Remove",
        quantity: 1,
      });
      const participantRole = await findRole("Trip Participant");
      const incompletePerson = await registerUser({ email: "hold-remove-open@example.com", orgIds: [org.id] });
      const row = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: incompletePerson.user.personId,
        roleId: participantRole.id,
        tripWorkerRoleId: tripWorkerRole.id,
        status: "incomplete",
      });

      const removed = await request(app)
        .delete(`/trips/trip-worker-roles/${tripWorkerRole.id}`)
        .set(authHeader);
      expect(removed.status).toBe(200);
      await row.reload();
      expect(row.tripWorkerRoleId).toBeNull();

      const held = await createActiveTripWithRole(authHeader, org.id, {
        tripName: "Hold Remove Kept",
        quantity: 1,
      });
      const heldPerson = await registerUser({ email: "hold-remove-held@example.com", orgIds: [org.id] });
      await db.tripPeopleRole.create({
        tripId: held.trip.id,
        peopleId: heldPerson.user.personId,
        roleId: participantRole.id,
        tripWorkerRoleId: held.tripWorkerRole.id,
        status: "pre_approved",
      });
      const refused = await request(app)
        .delete(`/trips/trip-worker-roles/${held.tripWorkerRole.id}`)
        .set(authHeader);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe(
        "People have signed up for this role. Move or cancel them before removing it."
      );
    });
  });
});
