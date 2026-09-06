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
  assignOrgRole,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const createActiveTripWithRole = async (adminAuth, orgId, { tripName = "Apply Trip" } = {}) => {
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
      quantity: 5,
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
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          agreementAccepted: true,
          agreementSignatureName: "Test Applicant",
        });

      expect(response.status).toBe(200);
      expect(response.body.applicationStatus).toBe("applied");
      expect(response.body.assignment.status).toBe("applied");
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
          willRaiseFunds: false,
          hasPreferredRoommate: false,
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
});
