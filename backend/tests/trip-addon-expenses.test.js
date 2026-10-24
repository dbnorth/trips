/**
 * Feature 74 — Trip Add-on Expenses
 * Spec: features/feature-74-trip-addon-expenses.md
 */

import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { Op } from "sequelize";
import app from "../server.js";
import db from "../app/models/index.js";
import { sendTemplateEmail } from "../app/utils/emailDelivery.js";
import { runScheduledEmails } from "../app/utils/scheduledEmails.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import {
  syncTestDatabase,
  resetTestDatabase,
  registerUser,
  createOrgAdminUser,
  findRole,
} from "./helpers.js";

const TUESDAY = "2026-11-03";
const EMAIL_KEYS = ["EMAIL_MODE", "EMAIL_FILE_DIR"];
const INVALID_MESSAGE = "Each add-on expense needs a description and a cost of $0 or more.";
const ADDONS = [
  { description: "Travel insurance", cost: 75 },
  { description: "Antigua weekend excursion", cost: 400 },
];

describe("Feature 74 — Trip Add-on Expenses", () => {
  let savedEnv;
  let mailRoot;
  let admin;
  let org;
  let trip;
  let leader;
  let nora;
  let noraAssignment;
  let tripWorkerRole;
  let participantRole;

  const addAddons = (assignment = noraAssignment, list = ADDONS) =>
    db.tripPeopleRoleExpense.bulkCreate(
      list.map((expense) => ({ ...expense, tripPeopleRoleId: assignment.id }))
    );

  const savedAddons = async (assignment = noraAssignment) =>
    (
      await db.tripPeopleRoleExpense.findAll({
        where: { tripPeopleRoleId: assignment.id },
        order: [["id", "ASC"]],
      })
    ).map((row) => ({ description: row.description, cost: Number(row.cost) }));

  const leaderUpdate = (body) =>
    request(app).put(`/trips/trip-people-roles/${noraAssignment.id}`).set(leader.authHeader).send(body);

  const addDonation = (amount, personId = nora.user.personId) =>
    db.tripDonation.create({ tripId: trip.id, personId, amount });

  const staffDonation = (amount) =>
    request(app)
      .post("/trips/donations")
      .set(admin.authHeader)
      .send({
        tripId: trip.id,
        personId: nora.user.personId,
        amount,
        dateTime: "2026-10-15T14:00:00.000Z",
        donor: { firstName: "Dana", lastName: "Donor", status: "active" },
      });

  const addTemplate = async (eventCode, fields = {}) => {
    const emailType = await db.emailType.create({
      typeCode: eventCode,
      description: eventCode,
      eventCode,
    });
    return db.emailTemplate.create({
      orgId: org.id,
      tripId: null,
      emailTypeId: emailType.id,
      functionCode: "Send Now",
      fromEmail: "office@example.org",
      toAddress: "{{PARTICIPANT_EMAIL}}",
      subject: eventCode,
      emailBody: "Hello.",
      ...fields,
    });
  };

  const sentEmails = () =>
    db.emailLog.findAll({ where: { subject: { [Op.ne]: "Login" } }, order: [["id", "ASC"]] });

  /** Fill the given tokens for a participant and return each token's value. */
  const fillTokens = async (tokenCodes, personId = nora.user.personId) => {
    await seedEmailTokens();
    const result = await sendTemplateEmail({
      template: {
        orgId: org.id,
        fromEmail: "office@example.org",
        toAddress: "nora@example.org",
        subject: "Your trip statement",
        emailBody: tokenCodes.map((code) => `{{${code}}}`).join("|"),
      },
      tripId: trip.id,
      personId,
    });
    expect(result.status).toBe("sent");
    const log = await db.emailLog.findByPk(result.emailLogId);
    const values = log.content.split("|");
    return Object.fromEntries(tokenCodes.map((code, index) => [code, values[index]]));
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    savedEnv = Object.fromEntries(EMAIL_KEYS.map((key) => [key, process.env[key]]));
    mailRoot = fs.mkdtempSync(path.join(os.tmpdir(), "trips-addons-"));
    process.env.EMAIL_MODE = "file";
    process.env.EMAIL_FILE_DIR = path.join(mailRoot, "mail");

    admin = await createOrgAdminUser({ email: "addon-admin@example.org" });
    org = admin.org;
    participantRole = await findRole("Trip Participant");
    trip = await db.trip.create({
      orgId: org.id,
      name: "Guatemala Hospital Ezel",
      status: "active",
      startDate: "2026-12-01",
      endDate: "2026-12-10",
      participantCost: 2000,
      deposit: 300,
    });
    const workerRole = await db.workerRole.create({ orgId: org.id, name: "Nurse" });
    tripWorkerRole = await db.tripWorkerRole.create({
      tripId: trip.id,
      workerRoleId: workerRole.id,
      quantity: 5,
    });

    leader = await registerUser({ email: "leader@example.org", orgIds: [org.id] });
    await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: leader.user.personId,
      roleId: (await findRole("Trip Leader")).id,
      status: "approved",
    });

    nora = await registerUser({
      email: "nora@example.org",
      firstName: "Nora",
      lastName: "Diaz",
      orgIds: [org.id],
    });
    noraAssignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: nora.user.personId,
      roleId: participantRole.id,
      tripWorkerRoleId: tripWorkerRole.id,
      status: "approved",
      participantCost: 2250,
      flightPurchaseOption: "organization",
    });
    const privateRoom = await db.tripTravelOption.create({
      tripId: trip.id,
      description: "Private room",
      priceAdjustment: 250,
      setNumber: 1,
    });
    await db.tripPeopleRoleOption.create({
      tripPeopleRoleId: noraAssignment.id,
      tripTravelOptionId: privateRoom.id,
      selected: true,
    });
    await db.tripFlight.create({ tripPeopleRoleId: noraAssignment.id, cost: 850 });
  });

  afterEach(async () => {
    for (const key of EMAIL_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    fs.rmSync(mailRoot, { recursive: true, force: true });
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-74.1 — Staff add add-on expenses to a participant", () => {
    it("Staff save add-on expenses on a participant", async () => {
      expect((await leaderUpdate({ addonExpenses: ADDONS })).status).toBe(200);

      const roster = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: trip.id })
        .set(leader.authHeader);
      expect(roster.status).toBe(200);
      const row = roster.body.find((r) => r.id === noraAssignment.id);
      expect(row.addonExpenses.map(({ description, cost }) => ({ description, cost }))).toEqual(ADDONS);
      expect(row.addonExpenses.every((expense) => Number.isInteger(expense.id))).toBe(true);

      const one = await request(app)
        .get(`/trips/trip-people-roles/${noraAssignment.id}`)
        .set(leader.authHeader);
      expect(one.body.addonExpenses.map(({ description, cost }) => ({ description, cost }))).toEqual(ADDONS);
    });

    it("Saving a shorter list removes add-on expenses", async () => {
      await addAddons();

      expect((await leaderUpdate({ addonExpenses: [ADDONS[0]] })).status).toBe(200);

      expect(await savedAddons()).toEqual([{ description: "Travel insurance", cost: 75 }]);
    });

    it("An invalid add-on expense is refused", async () => {
      await addAddons();
      const before = await db.tripPeopleRole.findByPk(noraAssignment.id);

      const response = await leaderUpdate({
        status: "approved",
        whygoText: "Changed",
        addonExpenses: [{ description: "Travel insurance", cost: "" }],
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(INVALID_MESSAGE);
      const after = await db.tripPeopleRole.findByPk(noraAssignment.id);
      expect(after.whygoText).toBe(before.whygoText);
      expect(after.version).toBe(before.version);
      expect(await savedAddons()).toEqual(ADDONS);
    });

    it("The participant's own application edit keeps add-on expenses", async () => {
      await noraAssignment.update({ status: "applied" });
      await addAddons();

      const response = await request(app)
        .put(`/trips/trips/browse/${trip.id}/application`)
        .set(nora.authHeader)
        .send({
          tripWorkerRoleId: tripWorkerRole.id,
          willSelfFund: true,
          flightPurchaseOption: "self",
          willRaiseFunds: false,
          hasPreferredRoommate: false,
          isPregnant: false,
          agreementAccepted: true,
          agreementSignatureName: "Nora Diaz",
        });

      expect(response.status).toBe(200);
      expect(await savedAddons()).toEqual(ADDONS);
    });

    it("Deleting the application deletes its add-on expenses", async () => {
      await addAddons();

      const response = await request(app)
        .delete(`/trips/trip-people-roles/${noraAssignment.id}`)
        .set(leader.authHeader);

      expect(response.status).toBe(200);
      expect(await db.tripPeopleRoleExpense.count({ where: { tripPeopleRoleId: noraAssignment.id } })).toBe(0);
    });
  });

  describe("US-74.2 — Every total includes add-on expenses", () => {
    beforeEach(async () => {
      await addAddons();
    });

    it("Trip Status amount owed includes airfare and add-on expenses", async () => {
      await addDonation(1000);

      const response = await request(app)
        .get(`/trips/trips/${trip.id}/status`)
        .set(leader.authHeader);

      expect(response.status).toBe(200);
      const row = response.body.participants.find((p) => p.peopleId === nora.user.personId);
      expect(row.amountOwed).toBe(2575);
      expect(row.totalTripCost).toBe(3575);
      expect(row.costBreakdown.airfare).toBe(850);
      expect(row.costBreakdown.addonExpenses).toHaveLength(2);
    });

    it("View Trip roster returns each participant's total cost", async () => {
      const response = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: trip.id })
        .set(leader.authHeader);

      expect(response.status).toBe(200);
      const row = response.body.find((r) => r.id === noraAssignment.id);
      expect(row.participantCost).toBe("2250.00");
      expect(row.totalTripCost).toBe(3575);
      expect(row.costBreakdown).toEqual({
        tripCost: 2000,
        tripOptions: [{ description: "Private room", amount: 250 }],
        adjustment: 0,
        addonExpenses: [
          { description: "Travel insurance", amount: 75 },
          { description: "Antigua weekend excursion", amount: 400 },
        ],
        airfare: 850,
        totalTripCost: 3575,
      });
    });

    it("Total cost details show a staff cost override as an adjustment", async () => {
      await noraAssignment.update({ participantCost: 2100 });

      const response = await request(app)
        .get("/trips/trip-people-roles")
        .query({ tripId: trip.id })
        .set(leader.authHeader);

      const row = response.body.find((r) => r.id === noraAssignment.id);
      expect(row.costBreakdown.adjustment).toBe(-150);
      expect(row.costBreakdown.totalTripCost).toBe(3425);
    });

    it("Trips list total cost includes airfare and add-on expenses", async () => {
      const response = await request(app).get("/trips/trips").set(admin.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.find((t) => t.id === trip.id).totalParticipantCost).toBe(5575);
    });

    it("My Trips next step uses the full amount owed", async () => {
      await addDonation(1000);

      const response = await request(app)
        .get("/trips/trips/browse/mine")
        .query({ orgId: org.id })
        .set(nora.authHeader);

      expect(response.status).toBe(200);
      const mine = response.body.find((t) => t.id === trip.id);
      expect(mine.nextActions).toContainEqual({ code: "make-donation", amountOwed: 2575 });
    });

    it("Email totals include add-on expenses and count trip options once", async () => {
      await addDonation(1000);

      const values = await fillTokens([
        "PARTICIPANT_TOTAL_TRIP_COST",
        "PARTICIPANT_BALANCE_DUE",
        "PARTICIPANT_AMOUNT_OWED",
      ]);

      expect(values).toEqual({
        PARTICIPANT_TOTAL_TRIP_COST: "$3,575.00",
        PARTICIPANT_BALANCE_DUE: "$2,575.00",
        PARTICIPANT_AMOUNT_OWED: "$2,575.00",
      });
    });

    it("Payment complete waits for the add-on expenses", async () => {
      await seedEmailTokens();
      await addTemplate("payment-complete", { subject: "Trip fully paid" });
      await addDonation(3100);

      expect((await staffDonation(400)).status).toBe(200);
      expect((await sentEmails()).map((log) => log.subject)).toEqual([]);

      expect((await staffDonation(75)).status).toBe(200);
      expect((await sentEmails()).map((log) => log.subject)).toEqual(["Trip fully paid"]);
    });

    it("Payment-due reminder includes a participant who owes only add-on expenses", async () => {
      await seedEmailTokens();
      await addTemplate("payment-due", { functionCode: "Scheduled", scheduleRule: "weekly" });
      await addDonation(3100);

      await runScheduledEmails({ date: TUESDAY, output: () => {} });

      expect((await sentEmails()).map((log) => log.toEmail)).toContain("nora@example.org");
    });
  });

  describe("US-74.3 — Email tokens list add-on expenses", () => {
    it("Add-on expense tokens list each expense and the total", async () => {
      await addAddons();

      const values = await fillTokens(["ADDON_EXPENSE", "ADDON_EXPENSE_TOTAL"]);

      expect(values).toEqual({
        ADDON_EXPENSE: "Travel insurance: $75.00\nAntigua weekend excursion: $400.00",
        ADDON_EXPENSE_TOTAL: "$475.00",
      });
    });

    it("Add-on expense tokens with no add-on expenses", async () => {
      await addAddons();
      const rita = await db.person.create({ firstName: "Rita", lastName: "Gomez", email: "rita@example.org" });
      await db.tripPeopleRole.create({
        tripId: trip.id,
        peopleId: rita.id,
        roleId: participantRole.id,
        status: "approved",
      });

      const values = await fillTokens(["ADDON_EXPENSE", "ADDON_EXPENSE_TOTAL"], rita.id);

      expect(values).toEqual({ ADDON_EXPENSE: "", ADDON_EXPENSE_TOTAL: "$0.00" });
    });
  });

  describe("US-74.4 — Participants see their add-on expenses", () => {
    it("My Trip Info returns add-on expenses and the total trip cost", async () => {
      await addAddons();

      const response = await request(app)
        .get(`/trips/trips/browse/${trip.id}`)
        .set(nora.authHeader);

      expect(response.status).toBe(200);
      expect(response.body.myTripInfo.addonExpenses).toEqual(
        ADDONS.map((expense) => ({ ...expense, daysBefore: 0, daysAfter: 0 }))
      );
      expect(response.body.myTripInfo.totalTripCost).toBe(3575);
    });
  });
});
