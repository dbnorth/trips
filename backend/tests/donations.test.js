/**
 * Feature 8 — Donors & Donations
 * Spec: features/feature-8-donors-and-donations.md
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

const setupTripWithLeaderAndParticipant = async ({
  adminEmail,
  leaderEmail,
  participantEmail,
  tripName = "Donation Trip",
} = {}) => {
  const { authHeader, org } = await createOrgAdminUser({ email: adminEmail });
  const leader = await registerUser({
    email: leaderEmail,
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
      name: tripName,
      status: "active",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
      participantCost: 2000,
      leaderPeopleIds: [leader.user.personId],
    });
  expect(trip.status).toBe(200);

  const participant = await registerUser({
    email: participantEmail,
    firstName: "Pat",
    lastName: "Participant",
    orgIds: [org.id],
  });
  await completePersonProfile(participant.user.personId);
  const participantRole = await findRole("Trip Participant");

  const assignment = await request(app)
    .post("/trips/trip-people-roles")
    .set(leader.authHeader)
    .send({
      tripId: trip.body.id,
      peopleId: participant.user.personId,
      roleId: participantRole.id,
      status: "approved",
    });
  expect(assignment.status).toBe(200);

  return {
    adminAuth: authHeader,
    org,
    leader,
    trip: trip.body,
    participant,
    assignment: assignment.body,
  };
};

describe("Feature 8 — Donors & Donations", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-8.1 — Record donations for a trip", () => {
    it("Trip Leader creates a donation", async () => {
      const { leader, trip, participant } = await setupTripWithLeaderAndParticipant({
        adminEmail: "donation-admin@example.com",
        leaderEmail: "donation-leader@example.com",
        participantEmail: "donation-participant@example.com",
      });

      const response = await request(app)
        .post("/trips/donations")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          personId: participant.user.personId,
          amount: 125.5,
          dateTime: "2026-06-15T14:00:00.000Z",
          paymentInfo: "Check #1001",
          donor: {
            firstName: "Dana",
            lastName: "Donor",
            email: "dana.donor@example.com",
            status: "active",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        tripId: trip.id,
        personId: participant.user.personId,
      });
      expect(Number(response.body.amount)).toBe(125.5);
      expect(response.body.donor).toMatchObject({
        firstName: "Dana",
        lastName: "Donor",
        email: "dana.donor@example.com",
      });

      const stored = await db.tripDonation.findByPk(response.body.id);
      expect(stored).not.toBeNull();
      expect(stored.personId).toBe(participant.user.personId);
      expect(stored.tripId).toBe(trip.id);
    });
  });

  describe("US-8.2 — Look up and maintain donors", () => {
    it("Staff looks up donor by email", async () => {
      const { adminAuth } = await setupTripWithLeaderAndParticipant({
        adminEmail: "lookup-admin@example.com",
        leaderEmail: "lookup-leader@example.com",
        participantEmail: "lookup-participant@example.com",
        tripName: "Lookup Trip",
      });

      const created = await request(app)
        .post("/trips/donors")
        .set(adminAuth)
        .send({
          firstName: "Look",
          lastName: "Up",
          email: "lookup.donor@example.com",
          city: "Austin",
          status: "active",
        });
      expect(created.status).toBe(200);

      const lookup = await request(app)
        .get("/trips/donors/lookup")
        .query({ email: "Lookup.Donor@example.com" })
        .set(adminAuth);

      expect(lookup.status).toBe(200);
      expect(lookup.body).toMatchObject({
        id: created.body.id,
        firstName: "Look",
        lastName: "Up",
        email: "lookup.donor@example.com",
        city: "Austin",
      });
    });
  });

  describe("US-8.3 — Participants view their donations", () => {
    it("Participant lists only own donations", async () => {
      const { leader, trip, participant, adminAuth } = await setupTripWithLeaderAndParticipant({
        adminEmail: "scope-admin@example.com",
        leaderEmail: "scope-leader@example.com",
        participantEmail: "scope-me@example.com",
        tripName: "Scope Trip",
      });

      const other = await registerUser({
        email: "scope-other@example.com",
        firstName: "Other",
        lastName: "Person",
        orgIds: [trip.orgId],
      });
      await completePersonProfile(other.user.personId);
      const participantRole = await findRole("Trip Participant");
      const otherAssignment = await request(app)
        .post("/trips/trip-people-roles")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          peopleId: other.user.personId,
          roleId: participantRole.id,
          status: "approved",
        });
      expect(otherAssignment.status).toBe(200);

      const mine = await request(app)
        .post("/trips/donations")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          personId: participant.user.personId,
          amount: 50,
          donor: { firstName: "Mine", email: "mine.donor@example.com" },
        });
      const theirs = await request(app)
        .post("/trips/donations")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          personId: other.user.personId,
          amount: 75,
          donor: { firstName: "Theirs", email: "theirs.donor@example.com" },
        });
      expect(mine.status).toBe(200);
      expect(theirs.status).toBe(200);

      const list = await request(app)
        .get("/trips/donations")
        .query({ tripId: trip.id })
        .set(participant.authHeader);

      expect(list.status).toBe(200);
      expect(list.body).toHaveLength(1);
      expect(list.body[0].id).toBe(mine.body.id);
      expect(list.body[0].personId).toBe(participant.user.personId);

      // Staff still see both
      const staffList = await request(app)
        .get("/trips/donations")
        .query({ tripId: trip.id })
        .set(adminAuth);
      expect(staffList.status).toBe(200);
      expect(staffList.body.map((d) => d.id)).toEqual(
        expect.arrayContaining([mine.body.id, theirs.body.id])
      );
    });
  });

  describe("US-8.4 — Export donors and donations CSV", () => {
    it("Staff exports donations CSV", async () => {
      const { adminAuth, leader, trip, participant } = await setupTripWithLeaderAndParticipant({
        adminEmail: "csv-donations-admin@example.com",
        leaderEmail: "csv-donations-leader@example.com",
        participantEmail: "csv-donations-participant@example.com",
        tripName: "CSV Donations Trip",
      });

      const donation = await request(app)
        .post("/trips/donations")
        .set(leader.authHeader)
        .send({
          tripId: trip.id,
          personId: participant.user.personId,
          amount: 200,
          donor: {
            firstName: "Export",
            lastName: "Donor",
            email: "export.donor@example.com",
          },
        });
      expect(donation.status).toBe(200);

      const csv = await request(app)
        .get(`/trips/export/trips/${trip.id}/donations.csv`)
        .set(adminAuth);

      expect(csv.status).toBe(200);
      expect(csv.headers["content-type"]).toMatch(/text\/csv/);
      expect(csv.text).toMatch(/Amount/);
      expect(csv.text).toMatch(/Export/);
      expect(csv.text).toMatch(/export\.donor@example\.com/);
    });
  });
});
