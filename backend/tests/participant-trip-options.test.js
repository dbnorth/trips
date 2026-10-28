/**
 * Feature 92 — Trip Options in the Participant Edit Dialog
 * Spec: features/feature-92-participant-edit-trip-options.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createOrgAdminUser, findRole } from "./helpers.js";

describe("Feature 92 — Trip Options in the Participant Edit Dialog", () => {
  let omar;
  let org;
  let trip;
  let options;
  let anaAssignment;
  let benAssignment;

  const addOption = (description, setNumber, priceAdjustment, days = {}) =>
    db.tripTravelOption.create({ tripId: trip.id, description, priceAdjustment, setNumber, ...days });

  const update = (assignment, body) =>
    request(app).put(`/trips/trip-people-roles/${assignment.id}`).set(omar.authHeader).send(body);

  const selectedIds = async (assignment) =>
    (await db.tripPeopleRoleOption.findAll({ where: { tripPeopleRoleId: assignment.id, selected: true } }))
      .map((row) => row.tripTravelOptionId)
      .sort((a, b) => a - b);

  const savedCost = async (assignment) => {
    await assignment.reload();
    return assignment.participantCost == null ? null : Number(assignment.participantCost);
  };

  const rosterRow = async (assignment) => {
    const roster = await request(app).get("/trips/trip-people-roles").query({ tripId: trip.id }).set(omar.authHeader);
    expect(roster.status).toBe(200);
    return roster.body.find((row) => row.id === assignment.id);
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    org = omar.org;
    trip = await db.trip.create({
      orgId: org.id,
      name: "Clinica Ezell Hospital - January 2027",
      status: "active",
      startDate: "2027-01-16",
      endDate: "2027-01-23",
      participantCost: 1500,
    });
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "RN" });
    const tripWorkerRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: workerRole.id, quantity: 5 });
    options = {
      departSaturday: await addOption("Depart Saturday", 1, 0),
      antigua: await addOption("Antigua Trip - stay Friday night", 1, 150, { daysAfter: 1 }),
      volcano: await addOption("Volcano hike - extra day", 2, 75, { daysAfter: 1 }),
    };
    const participantRoleId = (await findRole("Trip Participant")).id;
    const ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez", orgIds: [org.id] });
    anaAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.user.personId,
      roleId: participantRoleId,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
      participantCost: 1550,
    });
    await db.tripPeopleRoleOption.create({
      tripPeopleRoleId: anaAssignment.id,
      tripTravelOptionId: options.departSaturday.id,
      selected: true,
    });
    const ben = await registerUser({ email: "ben@example.org", firstName: "Ben", lastName: "Ortiz", orgIds: [org.id] });
    benAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ben.user.personId,
      roleId: participantRoleId,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "applied",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-92.1 — Staff see and change a participant's trip options", () => {
    it("Staff change a participant's trip option", async () => {
      const saved = await update(anaAssignment, {
        selectedTravelOptionIds: [options.antigua.id],
        participantCost: 1700,
      });

      expect(saved.status).toBe(200);
      expect(await selectedIds(anaAssignment)).toEqual([options.antigua.id]);
      expect((await rosterRow(anaAssignment)).departureDate).toBe("2027-01-24");
    });

    it("Invalid trip option selections are refused", async () => {
      const otherTrip = await db.trip.create({ orgId: org.id, name: "Other trip", status: "active" });
      const otherOption = await db.tripTravelOption.create({
        tripId: otherTrip.id,
        description: "Other option",
        priceAdjustment: 0,
        setNumber: 1,
      });

      const cases = [
        [[options.antigua.id, options.volcano.id], "Choose only one trip option with days after the trip."],
        [[options.departSaturday.id, options.antigua.id], "Only one travel option can be selected per trip option group."],
        [[otherOption.id], "One or more selected travel options are invalid for this trip."],
      ];
      for (const [ids, message] of cases) {
        const refused = await update(anaAssignment, { selectedTravelOptionIds: ids });
        expect(refused.status).toBe(400);
        expect(refused.body.message).toBe(message);
      }
      expect(await selectedIds(anaAssignment)).toEqual([options.departSaturday.id]);
      expect(await savedCost(anaAssignment)).toBe(1550);
    });
  });

  describe("US-92.2 — Changing options updates the participant cost", () => {
    it("Saved options and cost show in the cost breakdown", async () => {
      const saved = await update(anaAssignment, {
        selectedTravelOptionIds: [options.antigua.id],
        participantCost: 1700,
      });
      expect(saved.status).toBe(200);

      const row = await rosterRow(anaAssignment);
      expect(Number(row.participantCost)).toBe(1700);
      expect(row.totalTripCost).toBe(1700);
      expect(row.costBreakdown).toMatchObject({
        tripCost: 1500,
        tripOptions: [{ description: "Antigua Trip - stay Friday night", amount: 150 }],
        adjustment: 50,
      });
    });

    it("The API shifts the cost when only options are sent", async () => {
      const ana = await update(anaAssignment, { selectedTravelOptionIds: [options.antigua.id] });
      expect(ana.status).toBe(200);
      expect(await savedCost(anaAssignment)).toBe(1700);

      const ben = await update(benAssignment, { selectedTravelOptionIds: [options.volcano.id] });
      expect(ben.status).toBe(200);
      expect(await savedCost(benAssignment)).toBe(1575);

      const unchanged = await update(anaAssignment, { addonExpenses: [] });
      expect(unchanged.status).toBe(200);
      expect(await selectedIds(anaAssignment)).toEqual([options.antigua.id]);
      expect(await savedCost(anaAssignment)).toBe(1700);
    });
  });
});
