/**
 * Feature 61 — Trip Page My Travel Details
 * Spec: features/feature-61-trip-page-my-travel-details.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrganization,
  findRole,
  completePersonProfile,
} from "./helpers.js";

const createTrip = (orgId, fields = {}) =>
  db.trip.create({
    orgId,
    name: "Guatemala Clinic",
    status: "active",
    startDate: "2027-01-10",
    endDate: "2027-01-20",
    participantCost: 1800,
    ...fields,
  });

const createAssignment = async (tripId, peopleId, fields = {}) => {
  const role = await findRole("Trip Participant");
  return db.tripPeopleRole.create({ tripId, peopleId, roleId: role.id, ...fields });
};

const setupParticipant = async (email = "ada@example.com") => {
  const org = await createOrganization("Hope Mission");
  const ada = await registerUser({ email, firstName: "Ada", lastName: "Applicant", orgIds: [org.id] });
  await completePersonProfile(ada.user.personId);
  return { org, ada };
};

const loadMyTripInfo = async (ada, tripId) => {
  const res = await request(app).get(`/trips/trips/browse/${tripId}`).set(ada.authHeader);
  expect(res.status).toBe(200);
  return res.body.myTripInfo;
};

const createSegment = (tripFlightId, airports, airline, fields) =>
  db.tripFlightSegment.create({
    tripFlightId,
    segmentNumber: 1,
    departureAirportId: airports.DFW.id,
    airlineId: airline.id,
    flightNumber: "100",
    departureDate: "2027-01-10",
    departureTime: "08:30",
    arrivalAirportId: airports.GUA.id,
    arrivalDate: "2027-01-10",
    arrivalTime: "12:00",
    ...fields,
  });

const seedAirportsAirline = async () => {
  const DFW = await db.airport.create({ code: "DFW", airportName: "Dallas/Fort Worth", city: "Dallas", country: "US" });
  const GUA = await db.airport.create({ code: "GUA", airportName: "La Aurora", city: "Guatemala City", country: "GT" });
  const airline = await db.airline.create({ code: "AA", name: "American Airlines" });
  return { airports: { DFW, GUA }, airline };
};

describe("Feature 61 — Trip Page My Travel Details", () => {
  beforeAll(async () => {
    await syncTestDatabase();
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-61.1 — See my room on the trip page", () => {
    it("Trip page returns my room", async () => {
      const { org, ada } = await setupParticipant();
      const ben = await registerUser({
        email: "ben@example.com",
        firstName: "Ben",
        lastName: "Ruiz",
        orgIds: [org.id],
      });
      const trip = await createTrip(org.id);
      const mine = await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      const bens = await createAssignment(trip.id, ben.user.personId, { status: "approved" });
      const list = await db.tripRoomingList.create({
        tripId: trip.id,
        hotelName: "Hotel Casa",
        checkInDate: "2027-01-10",
      });
      const room = await db.tripRoom.create({
        tripRoomingListId: list.id,
        roomNumber: "101",
        roomType: "Double",
        numberOfNights: 5,
      });
      await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: mine.id });
      await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: bens.id });

      const info = await loadMyTripInfo(ada, trip.id);

      expect(info.room).toEqual({
        hotelName: "Hotel Casa",
        roomType: "Double",
        roommates: ["Ben Ruiz"],
        checkInDate: "2027-01-10",
        checkOutDate: "2027-01-15",
      });
    });

    it("No room part without a room assignment", async () => {
      const { org, ada } = await setupParticipant("no-room@example.com");
      const trip = await createTrip(org.id);
      await createAssignment(trip.id, ada.user.personId, { status: "approved" });
      await db.tripRoomingList.create({ tripId: trip.id, hotelName: "Hotel Casa", checkInDate: "2027-01-10" });

      const info = await loadMyTripInfo(ada, trip.id);

      expect(info.room).toBeNull();
    });
  });

  describe("US-61.2 — See my flights on the trip page", () => {
    it("Trip page returns my flight segments in order", async () => {
      const { org, ada } = await setupParticipant("flights@example.com");
      const { airports, airline } = await seedAirportsAirline();
      const trip = await createTrip(org.id);
      const mine = await createAssignment(trip.id, ada.user.personId, {
        status: "approved",
        flightPurchaseOption: "self",
      });
      const flight = await db.tripFlight.create({ tripPeopleRoleId: mine.id });
      await createSegment(flight.id, airports, airline, {
        segmentType: "return",
        flightNumber: "200",
        departureAirportId: airports.GUA.id,
        arrivalAirportId: airports.DFW.id,
        departureDate: "2027-01-20",
        arrivalDate: "2027-01-20",
      });
      await createSegment(flight.id, airports, airline, { segmentType: "arrival" });

      const info = await loadMyTripInfo(ada, trip.id);

      expect(info.flightPurchaseOption).toBe("self");
      expect(info.flightSegments).toEqual([
        {
          segmentType: "arrival",
          segmentNumber: 1,
          airlineName: "American Airlines",
          flightNumber: "100",
          departureAirportCode: "DFW",
          departureDate: "2027-01-10",
          departureTime: "08:30",
          arrivalAirportCode: "GUA",
          arrivalDate: "2027-01-10",
          arrivalTime: "12:00",
        },
        {
          segmentType: "return",
          segmentNumber: 1,
          airlineName: "American Airlines",
          flightNumber: "200",
          departureAirportCode: "GUA",
          departureDate: "2027-01-20",
          departureTime: "08:30",
          arrivalAirportCode: "DFW",
          arrivalDate: "2027-01-20",
          arrivalTime: "12:00",
        },
      ]);
    });

    it("Cancelled application has no travel details", async () => {
      const { org, ada } = await setupParticipant("cancelled@example.com");
      const { airports, airline } = await seedAirportsAirline();
      const trip = await createTrip(org.id);
      const mine = await createAssignment(trip.id, ada.user.personId, {
        status: "cancelled",
        flightPurchaseOption: "self",
      });
      const list = await db.tripRoomingList.create({ tripId: trip.id, hotelName: "Hotel Casa" });
      const room = await db.tripRoom.create({
        tripRoomingListId: list.id,
        roomNumber: "101",
        roomType: "King",
        numberOfNights: 3,
      });
      await db.tripRoomAssignment.create({ tripRoomId: room.id, tripPeopleRoleId: mine.id });
      const flight = await db.tripFlight.create({ tripPeopleRoleId: mine.id });
      await createSegment(flight.id, airports, airline, { segmentType: "arrival" });
      const option = await db.tripTravelOption.create({ tripId: trip.id, description: "Extra beach day", priceAdjustment: 150 });
      await db.tripPeopleRoleOption.create({ tripPeopleRoleId: mine.id, tripTravelOptionId: option.id, selected: true });

      const info = await loadMyTripInfo(ada, trip.id);

      expect(info.room).toBeNull();
      expect(info.flightSegments).toEqual([]);
      expect(info.selectedTravelOptions).toEqual([]);
    });
  });

  describe("US-61.3 — See my selected trip options on the trip page", () => {
    it("Trip page returns my selected trip options", async () => {
      const { org, ada } = await setupParticipant("options@example.com");
      const trip = await createTrip(org.id);
      const mine = await createAssignment(trip.id, ada.user.personId, { status: "applied" });
      const beach = await db.tripTravelOption.create({
        tripId: trip.id,
        description: "Extra beach day",
        priceAdjustment: 150,
        setNumber: 1,
      });
      const tour = await db.tripTravelOption.create({
        tripId: trip.id,
        description: "City tour",
        priceAdjustment: 0,
        setNumber: 2,
      });
      await db.tripPeopleRoleOption.create({ tripPeopleRoleId: mine.id, tripTravelOptionId: beach.id, selected: true });
      await db.tripPeopleRoleOption.create({ tripPeopleRoleId: mine.id, tripTravelOptionId: tour.id, selected: false });

      const info = await loadMyTripInfo(ada, trip.id);

      expect(info.selectedTravelOptions).toEqual([
        { id: beach.id, description: "Extra beach day", setNumber: 1, priceAdjustment: 150 },
      ]);
    });
  });
});
