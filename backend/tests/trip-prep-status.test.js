/**
 * Feature 109 — Trip Prep Status on the Trip Card
 * Spec: features/feature-109-trip-prep-status.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  createOrgAdminUser,
  registerUser,
  findRole,
} from "./helpers.js";

describe("Feature 109 — Trip Prep Status on the Trip Card", () => {
  let olivia;
  let orgId;
  let trip;
  let tripNurse;
  let tripDoctor;
  let airports;
  let airline;
  let room;

  const addParticipant = async (email, status, tripWorkerRole) => {
    const reg = await registerUser({ email, firstName: email.split("@")[0], lastName: "Test", orgIds: [orgId] });
    return db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: reg.user.personId,
      roleId: (await findRole("Trip Participant")).id,
      tripWorkerRoleId: tripWorkerRole.id,
      status,
    });
  };

  const addSegments = async (assignment, types = ["arrival", "return"]) => {
    const flight = await db.tripFlight.create({ tripPeopleRoleId: assignment.id });
    for (const segmentType of types) {
      await db.tripFlightSegment.create({
        tripFlightId: flight.id,
        segmentType,
        segmentNumber: 1,
        departureAirportId: airports.DFW.id,
        airlineId: airline.id,
        flightNumber: "100",
        departureDate: "2099-06-10",
        departureTime: "08:30",
        arrivalAirportId: airports.GUA.id,
        arrivalDate: "2099-06-10",
        arrivalTime: "12:00",
      });
    }
  };

  const addRoom = async (assignment) => {
    if (!room) {
      const list = await db.tripRoomingList.create({ tripId: trip.id, hotelName: "Hotel Casa" });
      room = await db.tripRoom.create({
        tripRoomingListId: list.id,
        roomNumber: "101",
        roomType: "Triple",
        numberOfNights: 7,
      });
    }
    await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: assignment.id });
  };

  const addDonation = (amount) => db.tripDonation.create({ tripId: trip.id, amount });

  const prepFor = async (tripId) => {
    const response = await request(app).get("/trips/trips").set(olivia.authHeader);
    expect(response.status).toBe(200);
    return response.body.find((t) => t.id === tripId).prepStatus;
  };

  const preparedTrip = async () => {
    for (const [email, role] of [
      ["ana@example.org", tripNurse],
      ["ben@example.org", tripNurse],
      ["cara@example.org", tripDoctor],
    ]) {
      const assignment = await addParticipant(email, "approved", role);
      await addSegments(assignment);
      await addRoom(assignment);
    }
    await addDonation(3000);
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    room = null;
    olivia = await createOrgAdminUser({ email: "olivia@example.org", orgName: "Hope Missions" });
    orgId = olivia.org.id;
    trip = await db.trip.create({
      orgId,
      name: "Guatemala Clinic 2027",
      status: "active",
      startDate: "2099-06-10",
      endDate: "2099-06-17",
      participantCost: 1000,
    });
    const nurse = await db.workerRole.create({ orgId, name: "Nurse" });
    const doctor = await db.workerRole.create({ orgId, name: "Doctor" });
    tripNurse = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: nurse.id, quantity: 2 });
    tripDoctor = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: doctor.id, quantity: 1 });
    airports = {
      DFW: await db.airport.create({ code: "DFW", airportName: "Dallas/Fort Worth", city: "Dallas", country: "US" }),
      GUA: await db.airport.create({ code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" }),
    };
    airline = await db.airline.create({ code: "AA", name: "American Airlines" });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-109.1 — See whether a trip is ready", () => {
    it("Trips list returns each trip's prep status", async () => {
      for (const email of ["ana@example.org", "ben@example.org"]) {
        const nurse = await addParticipant(email, "approved", tripNurse);
        await addSegments(nurse);
        await addRoom(nurse);
      }
      const doctor = await addParticipant("cara@example.org", "pre_approved", tripDoctor);
      await addSegments(doctor);
      await addDonation(3500);

      expect(await prepFor(trip.id)).toEqual({
        rolesFilled: true,
        participantsApproved: false,
        fundsRaised: true,
        flightsEntered: true,
        roomListComplete: false,
      });
    });

    it("A trip with no participants is not prepared", async () => {
      const peru = await db.trip.create({ orgId, name: "Peru 2099", status: "active", startDate: "2099-08-01" });

      expect(await prepFor(peru.id)).toEqual({
        rolesFilled: true,
        participantsApproved: false,
        fundsRaised: true,
        flightsEntered: false,
        roomListComplete: false,
      });
    });

    it("Cancelled applications don't affect prep status", async () => {
      await preparedTrip();
      await addParticipant("dev@example.org", "cancelled", tripNurse);

      expect(await prepFor(trip.id)).toEqual({
        rolesFilled: true,
        participantsApproved: true,
        fundsRaised: true,
        flightsEntered: true,
        roomListComplete: true,
      });
    });

    it("Flights need both an Arrival and a Return segment", async () => {
      await preparedTrip();
      const late = await addParticipant("eve@example.org", "approved", tripNurse);
      await addSegments(late, ["arrival"]);
      await addRoom(late);
      await addDonation(1000);

      const prep = await prepFor(trip.id);
      expect(prep.flightsEntered).toBe(false);
      expect(prep.roomListComplete).toBe(true);
    });
  });
});
