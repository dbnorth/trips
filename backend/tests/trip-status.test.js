/**
 * Feature 28 — View Trip Status
 * Spec: features/feature-28-view-trip-status.md
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

const setupTripWithRole = async ({
  adminEmail = "status-admin@example.com",
  tripName = "Status Trip",
  quantity = 2,
  participantCost = 1000,
} = {}) => {
  const { authHeader, org } = await createOrgAdminUser({ email: adminEmail });

  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId: org.id,
      name: tripName,
      status: "active",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
      participantCost,
    });
  expect(trip.status).toBe(200);

  const workerRole = await request(app)
    .post("/trips/worker-roles")
    .set(authHeader)
    .send({
      orgId: org.id,
      name: "Nurse",
      licenseRequired: false,
    });
  expect(workerRole.status).toBe(200);

  const tripWorkerRole = await request(app)
    .post("/trips/trip-worker-roles")
    .set(authHeader)
    .send({
      tripId: trip.body.id,
      workerRoleId: workerRole.body.id,
      quantity,
    });
  expect(tripWorkerRole.status).toBe(200);

  return {
    authHeader,
    org,
    trip: trip.body,
    workerRole: workerRole.body,
    tripWorkerRole: tripWorkerRole.body,
  };
};

describe("Feature 28 — View Trip Status", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-28.1 — Open Trip Status from trip detail", () => {
    it("Unauthorized user cannot open Trip Status", async () => {
      const { trip } = await setupTripWithRole({
        adminEmail: "status-forbid-admin@example.com",
      });

      const outsider = await registerUser({
        email: "status-outsider@example.com",
        firstName: "Out",
        lastName: "Sider",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(outsider.authHeader);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe("US-28.2 — See trip heading with role counts", () => {
    it("Heading lists roles with signed-up and available counts", async () => {
      const { authHeader, org, trip, tripWorkerRole } = await setupTripWithRole({
        adminEmail: "status-roles-admin@example.com",
        quantity: 2,
      });

      const participant = await registerUser({
        email: "status-roles-part@example.com",
        firstName: "Pat",
        lastName: "One",
        orgIds: [org.id],
      });
      await completePersonProfile(participant.user.personId);
      const participantRole = await findRole("Trip Participant");

      const assignment = await request(app)
        .post("/trips/trip-people-roles")
        .set(authHeader)
        .send({
          tripId: trip.id,
          peopleId: participant.user.personId,
          roleId: participantRole.id,
          tripWorkerRoleId: tripWorkerRole.id,
          status: "incomplete",
          willSelfFund: true,
        });
      expect(assignment.status).toBe(200);

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.trip.name).toBe(trip.name);
      const role = response.body.rolesNeeded.find((r) => Number(r.id) === Number(tripWorkerRole.id));
      expect(role).toMatchObject({
        quantity: 2,
        signedUpCount: 1,
        availableCount: 1,
        workerRoleName: "Nurse",
      });
    });
  });

  describe("US-28.3 — See participant status board", () => {
    it("Row shows status, missing items, owed, and raised", async () => {
      const { authHeader, org, trip, tripWorkerRole } = await setupTripWithRole({
        adminEmail: "status-row-admin@example.com",
        participantCost: 1000,
      });

      const participant = await registerUser({
        email: "status-row-part@example.com",
        firstName: "Ada",
        lastName: "Applicant",
        orgIds: [org.id],
      });
      // Incomplete profile → missing items includes Profile is not complete
      const participantRole = await findRole("Trip Participant");

      const assignment = await request(app)
        .post("/trips/trip-people-roles")
        .set(authHeader)
        .send({
          tripId: trip.id,
          peopleId: participant.user.personId,
          roleId: participantRole.id,
          tripWorkerRoleId: tripWorkerRole.id,
          status: "incomplete",
          participantCost: 1000,
          willSelfFund: false,
          willRaiseFunds: false,
        });
      expect(assignment.status).toBe(200);

      const donation = await request(app)
        .post("/trips/donations")
        .set(authHeader)
        .send({
          tripId: trip.id,
          personId: participant.user.personId,
          amount: 250,
          dateTime: "2026-06-15T14:00:00.000Z",
          paymentInfo: "Check",
          donor: {
            firstName: "Dana",
            lastName: "Donor",
            email: "status-donor@example.com",
            status: "active",
          },
        });
      expect(donation.status).toBe(200);

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(authHeader);

      expect(response.status).toBe(200);
      const row = response.body.participants.find(
        (p) => Number(p.peopleId) === Number(participant.user.personId)
      );
      expect(row).toBeTruthy();
      expect(row.status).toBe("incomplete");
      expect(row.missingItems).toEqual(expect.arrayContaining(["Profile is not complete"]));
      expect(row.amountRaised).toBe(250);
      expect(row.amountOwed).toBe(750);
    });

    it("Travel option columns reflect selections", async () => {
      const { authHeader, org, trip, tripWorkerRole } = await setupTripWithRole({
        adminEmail: "status-opts-admin@example.com",
      });

      const optionA = await request(app)
        .post("/trips/trip-travel-options")
        .set(authHeader)
        .send({
          tripId: trip.id,
          description: "Option A",
          setNumber: 1,
          priceAdjustment: 0,
        });
      expect(optionA.status).toBe(200);

      const optionB = await request(app)
        .post("/trips/trip-travel-options")
        .set(authHeader)
        .send({
          tripId: trip.id,
          description: "Option B",
          setNumber: 1,
          priceAdjustment: 50,
        });
      expect(optionB.status).toBe(200);

      const participant = await registerUser({
        email: "status-opts-part@example.com",
        firstName: "Sel",
        lastName: "Ect",
        orgIds: [org.id],
      });
      await completePersonProfile(participant.user.personId);
      const participantRole = await findRole("Trip Participant");

      const assignment = await request(app)
        .post("/trips/trip-people-roles")
        .set(authHeader)
        .send({
          tripId: trip.id,
          peopleId: participant.user.personId,
          roleId: participantRole.id,
          tripWorkerRoleId: tripWorkerRole.id,
          status: "incomplete",
          willSelfFund: true,
        });
      expect(assignment.status).toBe(200);

      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: assignment.body.id,
        tripTravelOptionId: optionA.body.id,
        selected: true,
      });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: assignment.body.id,
        tripTravelOptionId: optionB.body.id,
        selected: false,
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.travelOptions.map((o) => o.description)).toEqual(
        expect.arrayContaining(["Option A", "Option B"])
      );

      const row = response.body.participants.find(
        (p) => Number(p.peopleId) === Number(participant.user.personId)
      );
      expect(row.selectedTravelOptionIds.map(Number)).toEqual([Number(optionA.body.id)]);
      expect(row.selectedTravelOptionIds.map(Number)).not.toContain(Number(optionB.body.id));
    });
  });
});
