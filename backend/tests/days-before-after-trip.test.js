/**
 * Feature 78 — Days Before and After the Trip
 * Spec: features/feature-78-days-before-after-trip.md
 */

import request from "supertest";
import app from "../server.js";
import db from "../app/models/index.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  createSystemAdminUser,
  findRole,
} from "./helpers.js";

const DAYS_MESSAGE = "Days before and after must be whole numbers from -365 to 365.";

describe("Feature 78 — Days Before and After the Trip", () => {
  let omar;
  let org;
  let trip;
  let tripWorkerRole;
  let participantRole;
  let ana;
  let anaAssignment;
  let options;

  const addOption = (description, setNumber, days = {}) =>
    db.tripTravelOption.create({ tripId: trip.id, description, priceAdjustment: 0, setNumber, ...days });

  const selectOptions = (assignment, list) =>
    db.tripPeopleRoleOption.bulkCreate(
      list.map((option) => ({
        tripPeopleRoleId: assignment.id,
        tripTravelOptionId: option.id,
        selected: true,
      }))
    );

  const selectedDescriptions = async (assignment = anaAssignment) =>
    (
      await db.tripPeopleRoleOption.findAll({
        where: { tripPeopleRoleId: assignment.id, selected: true },
        include: [{ model: db.tripTravelOption, as: "tripTravelOption" }],
      })
    )
      .map((row) => row.tripTravelOption.description)
      .sort();

  const updateAddons = (addonExpenses) =>
    request(app)
      .put(`/trips/trip-people-roles/${anaAssignment.id}`)
      .set(omar.authHeader)
      .send({ addonExpenses });

  const saveApplication = (selectedOptions) =>
    request(app)
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
        selectedTravelOptionIds: selectedOptions.map((option) => option.id),
      });

  /** Ana chose "Arrive early" and has the add-on "Extra hotel night" (1 day before, 1 day after). */
  const giveAnaDays = async () => {
    await selectOptions(anaAssignment, [options.arriveEarly, options.noExtraNight]);
    await db.tripPeopleRoleExpense.create({
      tripPeopleRoleId: anaAssignment.id,
      description: "Extra hotel night",
      cost: 80,
      daysBefore: 1,
      daysAfter: 1,
    });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    omar = await createOrgAdminUser({ email: "omar@example.org", orgName: "Hope Missions" });
    org = omar.org;
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Clinic",
      status: "active",
      startDate: "2026-06-10",
      endDate: "2026-06-17",
      participantCost: 1500,
    });
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: workerRole.id,
      quantity: 5,
    });
    options = {
      arriveEarly: await addOption("Arrive early", 1, { daysBefore: 2 }),
      arriveOnTime: await addOption("Arrive on time", 1),
      extraEarlyNight: await addOption("Extra early night", 2, { daysBefore: 1 }),
      noExtraNight: await addOption("No extra night", 2),
    };
    participantRole = await findRole("Trip Participant");
    ana = await registerUser({
      email: "ana@example.org",
      firstName: "Ana",
      lastName: "Lopez",
      orgIds: [org.id],
    });
    anaAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.user.personId,
      roleId: participantRole.id,
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

  describe("US-78.1 — Staff set days on trip options", () => {
    it("Trip options save days before and after", async () => {
      const saved = await request(app)
        .put(`/trips/trip-travel-options/${options.arriveEarly.id}`)
        .set(omar.authHeader)
        .send({ daysBefore: 2, daysAfter: 1 });
      expect(saved.status).toBe(200);

      const list = await request(app)
        .get("/trips/trip-travel-options")
        .query({ tripId: trip.id })
        .set(omar.authHeader);
      expect(list.body.find((o) => o.description === "Arrive early")).toMatchObject({
        daysBefore: 2,
        daysAfter: 1,
      });

      for (const daysBefore of [-366, 2.5]) {
        const bad = await request(app)
          .put(`/trips/trip-travel-options/${options.arriveEarly.id}`)
          .set(omar.authHeader)
          .send({ daysBefore });
        expect(bad.status).toBe(400);
        expect(bad.body.message).toBe(DAYS_MESSAGE);
      }
      const badCreate = await request(app)
        .post("/trips/trip-travel-options")
        .set(omar.authHeader)
        .send({ tripId: trip.id, description: "Late return", priceAdjustment: 0, daysAfter: 366 });
      expect(badCreate.status).toBe(400);
      expect(badCreate.body.message).toBe(DAYS_MESSAGE);
    });
  });

  describe("US-78.2 — Participants choose at most one early and one late option", () => {
    it("Only one trip option with days before or after", async () => {
      await anaAssignment.update({ status: "applied" });
      await selectOptions(anaAssignment, [options.arriveOnTime, options.noExtraNight]);

      const refused = await saveApplication([options.arriveEarly, options.extraEarlyNight]);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Choose only one trip option with days before the trip.");
      expect(await selectedDescriptions()).toEqual(["Arrive on time", "No extra night"]);

      const saved = await saveApplication([options.arriveEarly, options.noExtraNight]);
      expect(saved.status).toBe(200);
      expect(await selectedDescriptions()).toEqual(["Arrive early", "No extra night"]);
    });
  });

  describe("US-78.3 — Staff set days on add-on expenses", () => {
    it("Only one add-on expense with days before or after", async () => {
      const extraNight = { description: "Extra hotel night", cost: 80, daysBefore: 1, daysAfter: 1 };

      const refused = await updateAddons([
        extraNight,
        { description: "Late checkout", cost: 20, daysAfter: 1 },
      ]);
      expect(refused.status).toBe(400);
      expect(refused.body.message).toBe("Only one add-on expense can have days after the trip.");
      expect(await db.tripPeopleRoleExpense.count({ where: { tripPeopleRoleId: anaAssignment.id } })).toBe(0);

      const invalid = await updateAddons([{ ...extraNight, daysBefore: -366 }]);
      expect(invalid.status).toBe(400);
      expect(invalid.body.message).toBe(DAYS_MESSAGE);

      const saved = await updateAddons([extraNight]);
      expect(saved.status).toBe(200);
      expect(saved.body.addonExpenses).toEqual([expect.objectContaining(extraNight)]);
    });
  });

  describe("US-78.4 — See each participant's arrival and departure dates", () => {
    it("Arrival and departure add days from options and expenses", async () => {
      await giveAnaDays();
      const ben = await db.person.create({ firstName: "Ben", lastName: "Ruiz", email: "ben@example.org" });
      const benAssignment = await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: ben.id,
        roleId: participantRole.id,
        status: "approved",
      });

      const roster = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: trip.id })
        .set(omar.authHeader);
      expect(roster.status).toBe(200);
      expect(roster.body.find((r) => r.id === anaAssignment.id)).toMatchObject({
        arrivalDate: "2026-06-07",
        departureDate: "2026-06-18",
        arrivalAdjustments: [
          { type: "option", description: "Arrive early", days: 2 },
          { type: "addon", description: "Extra hotel night", days: 1 },
        ],
        departureAdjustments: [{ type: "addon", description: "Extra hotel night", days: 1 }],
      });
      expect(roster.body.find((r) => r.id === benAssignment.id)).toMatchObject({
        arrivalDate: "2026-06-10",
        departureDate: "2026-06-17",
        arrivalAdjustments: [],
        departureAdjustments: [],
      });

      const browse = await request(app).get(`/trips/trips/browse/${trip.id}`).set(ana.authHeader);
      expect(browse.status).toBe(200);
      expect(browse.body.myTripInfo).toMatchObject({
        arrivalDate: "2026-06-07",
        departureDate: "2026-06-18",
      });
    });
  });

  describe("US-78.5 — Put arrival and departure dates in emails", () => {
    it("Arrival and departure date tokens", async () => {
      await giveAnaDays();
      await seedEmailTokens();

      const preview = await request(app)
        .post("/trips/email-templates/preview")
        .set(omar.authHeader)
        .send({
          orgId: org.id,
          tripId: trip.id,
          personId: ana.user.personId,
          subject: "Your dates",
          emailBody: "You arrive {{PARTICIPANT_ARRIVAL_DATE}} and leave {{PARTICIPANT_DEPARTURE_DATE}}.",
        });
      expect(preview.status).toBe(200);
      expect(preview.body.emailBody).toBe("You arrive June 7, 2026 and leave June 18, 2026.");

      const sysAdmin = await createSystemAdminUser();
      const sources = await request(app).get("/trips/email-tokens/value-sources").set(sysAdmin.authHeader);
      expect(sources.body).toEqual(
        expect.arrayContaining([
          { valueSource: "participant.arrivalDate", label: "Participant arrival date" },
          { valueSource: "participant.departureDate", label: "Participant departure date" },
        ])
      );
      const tokens = await db.emailToken.findAll({
        where: { tokenCode: ["PARTICIPANT_ARRIVAL_DATE", "PARTICIPANT_DEPARTURE_DATE"] },
        order: [["tokenCode", "ASC"]],
      });
      expect(tokens.map((t) => [t.tokenCode, t.valueSource])).toEqual([
        ["PARTICIPANT_ARRIVAL_DATE", "participant.arrivalDate"],
        ["PARTICIPANT_DEPARTURE_DATE", "participant.departureDate"],
      ]);
    });
  });
});
