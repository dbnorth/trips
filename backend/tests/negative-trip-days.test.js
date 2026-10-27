/**
 * Feature 89 — Negative Trip Days and Wider Option Descriptions
 * Spec: features/feature-89-negative-trip-days.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { syncTestDatabase, resetTestDatabase, registerUser, createOrgAdminUser, findRole } from "./helpers.js";

const DAYS_MESSAGE = "Days before and after must be whole numbers from -365 to 365.";

describe("Feature 89 — Negative Trip Days", () => {
  let omar;
  let org;
  let trip;
  let tripWorkerRole;
  let ana;
  let anaAssignment;
  let options;

  const addOption = (description, setNumber, days = {}) =>
    db.tripTravelOption.create({ tripId: trip.id, description, priceAdjustment: 0, setNumber, ...days });

  const updateAddons = (addonExpenses) =>
    request(app)
      .put(`/trips/trip-people-roles/${anaAssignment.id}`)
      .set(omar.authHeader)
      .send({ addonExpenses });

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
      participantCost: 950,
    });
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "RN" });
    tripWorkerRole = await db.tripWorkerRole.create({ tripId: trip.id, workerRoleId: workerRole.id, quantity: 5 });
    options = {
      antigua: await addOption("Antigua Trip - stay Friday night", 4),
      departFriday: await addOption("Depart Friday", 4),
    };
    ana = await registerUser({ email: "ana@example.org", firstName: "Ana", lastName: "Lopez", orgIds: [org.id] });
    anaAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.user.personId,
      roleId: (await findRole("Trip Participant")).id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-89.1 — Staff give days that shorten the trip", () => {
    it("A trip option takes negative days", async () => {
      const saved = await request(app)
        .put(`/trips/trip-travel-options/${options.departFriday.id}`)
        .set(omar.authHeader)
        .send({ daysAfter: "-1" });
      expect(saved.status).toBe(200);
      await options.departFriday.reload();
      expect(options.departFriday.daysAfter).toBe(-1);

      const created = await request(app)
        .post("/trips/trip-travel-options")
        .set(omar.authHeader)
        .send({ tripId: trip.id, description: "Arrive Sunday", priceAdjustment: 0, setNumber: 5, daysBefore: -365 });
      expect(created.status).toBe(200);
      expect(created.body.daysBefore).toBe(-365);

      for (const daysAfter of [-366, "abc", 1.5]) {
        const bad = await request(app)
          .put(`/trips/trip-travel-options/${options.departFriday.id}`)
          .set(omar.authHeader)
          .send({ daysAfter });
        expect(bad.status).toBe(400);
        expect(bad.body.message).toBe(DAYS_MESSAGE);
      }
      await options.departFriday.reload();
      expect(options.departFriday.daysAfter).toBe(-1);
    });

    it("Negative days move arrival and departure the other way", async () => {
      await options.departFriday.update({ daysAfter: -1 });
      await db.tripPeopleRoleOption.create({
        tripPeopleRoleId: anaAssignment.id,
        tripTravelOptionId: options.departFriday.id,
        selected: true,
      });
      await db.tripPeopleRoleExpense.create({
        tripPeopleRoleId: anaAssignment.id,
        description: "Late arrival",
        cost: 0,
        daysBefore: -1,
      });

      const roster = await request(app).get("/trips/trip-people-roles").query({ tripId: trip.id }).set(omar.authHeader);
      expect(roster.status).toBe(200);
      expect(roster.body.find((row) => row.id === anaAssignment.id)).toMatchObject({
        arrivalDate: "2027-01-17",
        departureDate: "2027-01-22",
        arrivalAdjustments: [{ type: "addon", description: "Late arrival", days: -1 }],
        departureAdjustments: [{ type: "option", description: "Depart Friday", days: -1 }],
      });

      await seedEmailTokens();
      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(omar.authHeader)
        .send({
          orgId: org.id,
          tripId: trip.id,
          personId: ana.user.personId,
          subject: "Your dates",
          emailBody: "You leave {{PARTICIPANT_DEPARTURE_DATE}}.",
        });
      expect(preview.status).toBe(200);
      expect(preview.body.emailBody).toBe("You leave January 22, 2027.");
    });

    it("An add-on expense takes negative days", async () => {
      const lateArrival = { description: "Late arrival", cost: 0, daysBefore: -1, daysAfter: 0 };

      const saved = await updateAddons([lateArrival]);

      expect(saved.status).toBe(200);
      expect(saved.body.addonExpenses).toEqual([expect.objectContaining(lateArrival)]);
    });

    it("Negative days count toward the one-each limit", async () => {
      await options.departFriday.update({ daysAfter: -1 });
      const volcano = await addOption("Volcano hike", 5, { daysAfter: 1 });
      await anaAssignment.update({ status: "applied" });

      const refused = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(ana.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Ana Lopez",
          selectedTravelOptionIds: [options.departFriday.id, volcano.id],
        });
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Choose only one trip option with days after the trip.");
      expect(await db.tripPeopleRoleOption.count({ where: { tripPeopleRoleId: anaAssignment.id } })).toBe(0);

      const addons = await updateAddons([
        { description: "Late arrival", cost: 0, daysBefore: -1 },
        { description: "Early arrival", cost: 50, daysBefore: 2 },
      ]);
      expect(addons.status).toBe(400);
      expect(addons.body.message).toBe("Only one add-on expense can have days before the trip.");
      expect(await db.tripPeopleRoleExpense.count({ where: { tripPeopleRoleId: anaAssignment.id } })).toBe(0);
    });
  });
});
