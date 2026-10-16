/**
 * Feature 29 — Rooming List
 * Spec: features/feature-29-rooming-list.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const setupTripWithParticipants = async ({
  adminEmail = "rooming-admin@example.com",
  tripName = "Summer Outreach",
  withRoommate = true,
} = {}) => {
  const { authHeader, org } = await createOrgAdminUser({ email: adminEmail });

  const trip = await request(app)
    .post("/trips/trips")
    .set(authHeader)
    .send({
      orgId: org.id,
      name: tripName,
      status: "active",
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      participantCost: 1000,
    });
  expect(trip.status).toBe(200);

  const participantRole = await findRole("Trip Participant");

  const ada = await registerUser({
    email: `${adminEmail}-ada@example.com`,
    firstName: "Ada",
    lastName: "Applicant",
    orgIds: [org.id],
  });
  await completePersonProfile(ada.user.personId);

  const grace = await registerUser({
    email: `${adminEmail}-grace@example.com`,
    firstName: "Grace",
    lastName: "Hopper",
    orgIds: [org.id],
  });
  await completePersonProfile(grace.user.personId);

  const adaAssignment = await request(app)
    .post("/trips/trip-people-roles")
    .set(authHeader)
    .send({
      tripId: trip.body.id,
      peopleId: ada.user.personId,
      roleId: participantRole.id,
      status: "approved",
      willSelfFund: true,
      hasPreferredRoommate: withRoommate,
      preferredRoommateNames: withRoommate ? "Grace Hopper" : null,
    });
  expect(adaAssignment.status).toBe(200);

  const graceAssignment = await request(app)
    .post("/trips/trip-people-roles")
    .set(authHeader)
    .send({
      tripId: trip.body.id,
      peopleId: grace.user.personId,
      roleId: participantRole.id,
      status: "approved",
      willSelfFund: true,
      hasPreferredRoommate: false,
    });
  expect(graceAssignment.status).toBe(200);

  return {
    authHeader,
    org,
    trip: trip.body,
    ada,
    grace,
    adaAssignment: adaAssignment.body,
    graceAssignment: graceAssignment.body,
  };
};

describe("Feature 29 — Rooming List", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-29.1 — Open rooming list from trips list", () => {
    it("Unauthorized user cannot open rooming list", async () => {
      const { trip } = await setupTripWithParticipants({
        adminEmail: "rooming-forbid-admin@example.com",
      });
      const outsider = await registerUser({
        email: "rooming-outsider@example.com",
        firstName: "Out",
        lastName: "Sider",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/rooming`)
        .set(outsider.authHeader);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe("US-29.2 — Edit hotel header and participant room assignments", () => {
    it("Page shows trip heading, hotel fields, and roommate preferences", async () => {
      const { authHeader, trip, adaAssignment } = await setupTripWithParticipants({
        adminEmail: "rooming-prefs-admin@example.com",
        tripName: "Summer Outreach",
      });

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/rooming`)
        .set(authHeader);

      expect(response.status).toBe(200);
      expect(response.body.trip).toMatchObject({
        name: "Summer Outreach",
        startDate: "2026-07-01",
        endDate: "2026-07-14",
      });
      expect(response.body.roomingList).toBeNull();

      const ada = response.body.participants.find(
        (p) => Number(p.tripPeopleRoleId) === Number(adaAssignment.id)
      );
      expect(ada).toMatchObject({
        firstName: "Ada",
        lastName: "Applicant",
        hasPreferredRoommate: true,
        preferredRoommateNames: "Grace Hopper",
      });
    });
  });

  describe("US-29.3 — Save creates or updates rooms and assignments", () => {
    it("Save persists hotel and room assignments", async () => {
      const { authHeader, trip, adaAssignment, graceAssignment } =
        await setupTripWithParticipants({
          adminEmail: "rooming-save-admin@example.com",
        });

      const save = await request(app)
        .put(`/trips/trips/${trip.id}/rooming`)
        .set(authHeader)
        .send({
          hotelName: "Harbor Inn",
          checkInDate: "2026-07-01",
          notes: "Early check-in requested",
          assignments: [
            {
              tripPeopleRoleId: adaAssignment.id,
              roomNumber: "214",
              roomType: "Double",
              numberOfNights: 5,
            },
            {
              tripPeopleRoleId: graceAssignment.id,
              roomNumber: "214",
              roomType: "Double",
              numberOfNights: 5,
            },
          ],
        });

      expect(save.status).toBe(200);
      expect(save.body.roomingList).toMatchObject({
        hotelName: "Harbor Inn",
        checkInDate: "2026-07-01",
        notes: "Early check-in requested",
      });
      expect(save.body.rooms).toHaveLength(1);
      expect(save.body.rooms[0]).toMatchObject({
        roomNumber: "214",
        roomType: "Double",
        numberOfNights: 5,
      });

      const reload = await request(app)
        .get(`/trips/trips/${trip.id}/rooming`)
        .set(authHeader);

      expect(reload.status).toBe(200);
      expect(reload.body.roomingList.hotelName).toBe("Harbor Inn");
      const assigned = reload.body.participants.filter((p) => p.roomNumber === "214");
      expect(assigned).toHaveLength(2);
    });

    it("Conflicting room type on same room number is rejected", async () => {
      const { authHeader, trip, adaAssignment, graceAssignment } =
        await setupTripWithParticipants({
          adminEmail: "rooming-conflict-admin@example.com",
        });

      const save = await request(app)
        .put(`/trips/trips/${trip.id}/rooming`)
        .set(authHeader)
        .send({
          hotelName: "Harbor Inn",
          checkInDate: "2026-07-01",
          assignments: [
            {
              tripPeopleRoleId: adaAssignment.id,
              roomNumber: "214",
              roomType: "Double",
              numberOfNights: 5,
            },
            {
              tripPeopleRoleId: graceAssignment.id,
              roomNumber: "214",
              roomType: "King",
              numberOfNights: 5,
            },
          ],
        });

      expect(save.status).toBe(400);
      expect(save.body.message).toMatch(/Conflicting room type/i);

      const reload = await request(app)
        .get(`/trips/trips/${trip.id}/rooming`)
        .set(authHeader);
      expect(reload.status).toBe(200);
      expect(reload.body.rooms).toEqual([]);
      expect(reload.body.participants.every((p) => !p.roomNumber)).toBe(true);
    });
  });
});
