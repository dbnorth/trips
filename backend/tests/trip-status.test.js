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
        signedUpCount: 0,
        availableCount: 2,
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
          flightPurchaseOption: "self",
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

  describe("Feature 73 — US-73.1 See who books each participant's flight", () => {
    it("Trip Status API returns each participant's flight purchase option", async () => {
      const { authHeader, org, trip, tripWorkerRole } = await setupTripWithRole({
        adminEmail: "status-booked-admin@example.com",
        quantity: 3,
      });
      const participantRole = await findRole("Trip Participant");

      const addApplicant = async (firstName, flightPurchaseOption) => {
        const participant = await registerUser({
          email: `status-booked-${firstName.toLowerCase()}@example.com`,
          firstName,
          lastName: "Booked",
          orgIds: [org.id],
        });
        const assignment = await request(app)
          .post("/trips/trip-people-roles")
          .set(authHeader)
          .send({
            tripId: trip.id,
            peopleId: participant.user.personId,
            roleId: participantRole.id,
            tripWorkerRoleId: tripWorkerRole.id,
            status: "pre_approved",
            willSelfFund: true,
          });
        expect(assignment.status).toBe(200);
        await db.tripPeopleRole.update(
          { flightPurchaseOption },
          { where: { id: assignment.body.id } }
        );
        return participant.user.personId;
      };

      const noraId = await addApplicant("Nora", "organization");
      const ritaId = await addApplicant("Rita", "self");
      const hankId = await addApplicant("Hank", null);

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(authHeader);

      expect(response.status).toBe(200);
      const optionFor = (personId) =>
        response.body.participants.find((p) => Number(p.peopleId) === Number(personId))
          .flightPurchaseOption;
      expect(optionFor(noraId)).toBe("organization");
      expect(optionFor(ritaId)).toBe("self");
      expect(optionFor(hankId)).toBeNull();
    });
  });

  describe("Feature 135 — Trip Ready Status", () => {
  const readyTrip = async () => {
    const admin = await createOrgAdminUser({ email: "ready-admin@example.com" });
    const trip = await db.trip.create({
      orgId: admin.org.id,
      name: "Ready Trip",
      status: "active",
      startDate: "2027-06-01",
      endDate: "2027-06-08",
    });
    const roleId = (await findRole("Trip Participant")).id;
    const airport = await db.airport.create({
      code: "RDY",
      airportName: "Ready Field",
      city: "Ready",
      country: "US",
    });
    const airline = await db.airline.create({ code: "RD", name: "Ready Air" });
    const roomingList = await db.tripRoomingList.create({ tripId: trip.id, hotelName: "Inn" });
    const room = await db.tripRoom.create({
      tripRoomingListId: roomingList.id,
      roomNumber: "1",
      roomType: "Double",
      numberOfNights: 7,
    });

    const addPerson = async (firstName, { status = "approved", segments = [], room: assignRoom = false } = {}) => {
      const person = await db.person.create({
        firstName,
        lastName: "Lee",
        email: `${firstName.toLowerCase()}@example.org`,
      });
      const assignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: person.id,
        roleId,
        status,
      });
      if (segments.length) {
        const flight = await db.tripFlight.create({ tripPeopleRoleId: assignment.id });
        for (const [segmentType, segmentNumber] of segments) {
          await db.tripFlightSegment.create({
            tripFlightId: flight.id,
            segmentType,
            segmentNumber,
            airlineId: airline.id,
            flightNumber: "100",
            departureAirportId: airport.id,
            departureDate: "2027-06-01",
            departureTime: "08:00",
            arrivalAirportId: airport.id,
            arrivalDate: "2027-06-01",
            arrivalTime: "12:00",
          });
        }
      }
      if (assignRoom) {
        await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: assignment.id });
      }
      return person.id;
    };

    return { admin, trip, addPerson };
  };

  const missingFor = (body, personId) =>
    body.participants.find((row) => Number(row.peopleId) === Number(personId));

  it("A missing return flight is Not Ready", async () => {
    const { admin, trip, addPerson } = await readyTrip();
    const anaId = await addPerson("Ana", {
      segments: [["arrival", 1], ["return", 1]],
      room: true,
    });
    const benId = await addPerson("Ben", { segments: [["arrival", 1]], room: true });

    const response = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);

    expect(response.status).toBe(200);
    expect(missingFor(response.body, anaId)).toMatchObject({ tripReady: true, tripReadyMissing: [] });
    expect(missingFor(response.body, benId)).toMatchObject({
      tripReady: false,
      tripReadyMissing: ["No return flight."],
    });
  });

  it("A missing room is Not Ready", async () => {
    const { admin, trip, addPerson } = await readyTrip();
    const cyId = await addPerson("Cy", { segments: [["arrival", 1], ["return", 1]] });

    const response = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);

    expect(missingFor(response.body, cyId).tripReadyMissing).toEqual(["No room assigned."]);
  });

  it("A participant who is not approved is Not Ready", async () => {
    const { admin, trip, addPerson } = await readyTrip();
    const deeId = await addPerson("Dee", {
      status: "pre_approved",
      segments: [["arrival", 1], ["return", 1]],
      room: true,
    });

    const response = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);

    expect(missingFor(response.body, deeId).tripReadyMissing).toEqual(["Not approved."]);
  });

  it("Several unmet criteria are listed together", async () => {
    const { admin, trip, addPerson } = await readyTrip();
    const eliId = await addPerson("Eli", { status: "incomplete" });

    const response = await request(app).get(`/trips/trips/${trip.id}/status`).set(admin.authHeader);

    expect(missingFor(response.body, eliId).tripReadyMissing).toEqual([
      "Not approved.",
      "No arrival flight.",
      "No return flight.",
      "No room assigned.",
    ]);
  });
  });
});
