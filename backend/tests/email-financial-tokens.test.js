/**
 * Feature 52 — Participant Financial Statement Email Tokens
 * Spec: features/feature-52-participant-financial-tokens.md
 */

import db from "../app/models/index.js";
import { sendTemplateEmail } from "../app/utils/emailDelivery.js";
import { seedEmailTokens } from "../app/scripts/seedEmailTokens.js";
import { seedEmailTypes } from "../app/scripts/seedEmailTypes.js";
import { seedEmailTemplates } from "../app/scripts/seedEmailTemplates.js";
import { syncTestDatabase, resetTestDatabase, findRole } from "./helpers.js";

const FINANCIAL_TOKENS = [
  ["PARTICIPANT_TRIP_COST", "participant.tripCost"],
  ["PARTICIPANT_TRIP_OPTIONS", "participant.tripOptions"],
  ["PARTICIPANT_TRIP_OPTIONS_TOTAL", "participant.tripOptionsTotal"],
  ["PARTICIPANT_TRIP_AIRFARE", "participant.airfare"],
  ["PARTICIPANT_TOTAL_TRIP_COST", "participant.totalTripCost"],
  ["PARTICIPANT_DONATIONS", "participant.donations"],
  ["PARTICIPANT_DONATIONS_TOTAL", "participant.donationsTotal"],
  ["PARTICIPANT_TRIP_DONATIONS", "participant.tripDonations"],
  ["PARTICIPANT_TRIP_DONATIONS_TOTAL", "participant.tripDonationsTotal"],
  ["PARTICIPANT_BALANCE_DUE", "participant.balanceDue"],
];

describe("Feature 52 — Participant Financial Statement Email Tokens", () => {
  let org;
  let trip;
  let ana;
  let assignment;

  const addTokens = async (pairs) => {
    for (const [tokenCode, valueSource] of pairs) {
      await db.emailToken.create({ tokenCode, description: tokenCode, valueSource });
    }
  };

  /** Send a template whose body is the given tokens and return each token's filled value. */
  const sendTokens = async (tokenCodes) => {
    const result = await sendTemplateEmail({
      template: {
        orgId: org.id,
        fromEmail: "office@example.org",
        toAddress: "ana@example.org",
        subject: "Your trip statement",
        emailBody: tokenCodes.map((code) => `{{${code}}}`).join("|"),
      },
      tripId: trip.id,
      personId: ana.id,
    });
    expect(result.status).toBe("sent");
    const log = await db.emailLog.findByPk(result.emailLogId);
    const values = log.content.split("|");
    return Object.fromEntries(tokenCodes.map((code, index) => [code, values[index]]));
  };

  const addTripOption = async (description, priceAdjustment, setNumber = 1) => {
    const option = await db.tripTravelOption.create({
      tripId: trip.id,
      description,
      priceAdjustment,
      setNumber,
    });
    await db.tripPeopleRoleOption.create({
      tripPeopleRoleId: assignment.id,
      tripTravelOptionId: option.id,
      selected: true,
    });
  };

  const addFlight = async (flightPurchaseOption, cost) => {
    await assignment.update({ flightPurchaseOption });
    await db.tripFlight.create({ tripPeopleRoleId: assignment.id, cost });
  };

  const addDonation = async (amount, dateTime, donorEmail) => {
    const donor =
      donorEmail === undefined
        ? null
        : await db.donor.create({ firstName: "Donor", email: donorEmail });
    await db.tripDonation.create({
      tripId: trip.id,
      personId: ana.id,
      donorId: donor?.id ?? null,
      amount,
      dateTime,
    });
  };

  beforeAll(async () => {
    await syncTestDatabase();
  });

  beforeEach(async () => {
    org = await db.organization.create({ name: "Hope Mission", email: "office@example.org" });
    trip = await db.trip.create({ orgId: org.id, name: "Guatemala Clinic", participantCost: 1500 });
    ana = await db.person.create({ firstName: "Ana", lastName: "Lopez", email: "ana@example.org" });
    assignment = await db.tripPeopleRole.create({
      tripId: trip.id,
      peopleId: ana.id,
      roleId: (await findRole("Trip Participant")).id,
      status: "approved",
    });
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe("US-52.1 — Send a participant their trip financial statement", () => {
    it("Statement values for a participant", async () => {
      await addTokens(FINANCIAL_TOKENS);
      await addTripOption("Travel insurance", 75, 2);
      await addTripOption("Single room", 200, 1);
      await addFlight("organization", 800);

      const values = await sendTokens([
        "PARTICIPANT_TRIP_COST",
        "PARTICIPANT_TRIP_OPTIONS",
        "PARTICIPANT_TRIP_OPTIONS_TOTAL",
        "PARTICIPANT_TRIP_AIRFARE",
        "PARTICIPANT_TOTAL_TRIP_COST",
      ]);

      expect(values).toEqual({
        PARTICIPANT_TRIP_COST: "$1,500.00",
        PARTICIPANT_TRIP_OPTIONS: "Single room: $200.00\nTravel insurance: $75.00",
        PARTICIPANT_TRIP_OPTIONS_TOTAL: "$275.00",
        PARTICIPANT_TRIP_AIRFARE: "$800.00",
        PARTICIPANT_TOTAL_TRIP_COST: "$2,575.00",
      });
    });

    it("Airfare is not charged when the participant buys the flight", async () => {
      await addTokens(FINANCIAL_TOKENS);
      await addFlight("self", 800);

      const values = await sendTokens(["PARTICIPANT_TRIP_AIRFARE", "PARTICIPANT_TOTAL_TRIP_COST"]);

      expect(values).toEqual({
        PARTICIPANT_TRIP_AIRFARE: "$0.00",
        PARTICIPANT_TOTAL_TRIP_COST: "$1,500.00",
      });
    });

    it("Participant donations and trip donations are listed separately", async () => {
      await addTokens(FINANCIAL_TOKENS);
      await addDonation(250, "2026-10-05T17:00:00Z", "mary@example.org");
      await addDonation(300, "2026-10-01T17:00:00Z", "Ana@Example.org ");
      await addDonation(50, "2026-10-09T17:00:00Z", undefined);

      const values = await sendTokens([
        "PARTICIPANT_DONATIONS",
        "PARTICIPANT_DONATIONS_TOTAL",
        "PARTICIPANT_TRIP_DONATIONS",
        "PARTICIPANT_TRIP_DONATIONS_TOTAL",
      ]);

      expect(values).toEqual({
        PARTICIPANT_DONATIONS: "October 1, 2026: $300.00",
        PARTICIPANT_DONATIONS_TOTAL: "$300.00",
        PARTICIPANT_TRIP_DONATIONS: "October 5, 2026: $250.00\nOctober 9, 2026: $50.00",
        PARTICIPANT_TRIP_DONATIONS_TOTAL: "$300.00",
      });
    });

    it("Balance due", async () => {
      await addTokens(FINANCIAL_TOKENS);
      await addTripOption("Single room", 200);
      await addTripOption("Travel insurance", 75, 2);
      await addFlight("organization", 800);
      await addDonation(300, "2026-10-01T17:00:00Z", "ana@example.org");
      await addDonation(300, "2026-10-05T17:00:00Z", "mary@example.org");

      const values = await sendTokens(["PARTICIPANT_TOTAL_TRIP_COST", "PARTICIPANT_BALANCE_DUE"]);

      expect(values).toEqual({
        PARTICIPANT_TOTAL_TRIP_COST: "$2,575.00",
        PARTICIPANT_BALANCE_DUE: "$1,975.00",
      });
    });

    it("Balance due never goes below zero", async () => {
      await addTokens(FINANCIAL_TOKENS);
      await addDonation(1000, "2026-10-01T17:00:00Z", "ana@example.org");
      await addDonation(600, "2026-10-05T17:00:00Z", "mary@example.org");

      const values = await sendTokens(["PARTICIPANT_BALANCE_DUE"]);

      expect(values.PARTICIPANT_BALANCE_DUE).toBe("$0.00");
    });

    it("Nothing selected or received", async () => {
      await addTokens(FINANCIAL_TOKENS);

      const values = await sendTokens([
        "PARTICIPANT_TRIP_OPTIONS",
        "PARTICIPANT_DONATIONS",
        "PARTICIPANT_TRIP_DONATIONS",
        "PARTICIPANT_TRIP_OPTIONS_TOTAL",
        "PARTICIPANT_TRIP_AIRFARE",
        "PARTICIPANT_DONATIONS_TOTAL",
        "PARTICIPANT_TRIP_DONATIONS_TOTAL",
      ]);

      expect(values).toEqual({
        PARTICIPANT_TRIP_OPTIONS: "",
        PARTICIPANT_DONATIONS: "",
        PARTICIPANT_TRIP_DONATIONS: "",
        PARTICIPANT_TRIP_OPTIONS_TOTAL: "$0.00",
        PARTICIPANT_TRIP_AIRFARE: "$0.00",
        PARTICIPANT_DONATIONS_TOTAL: "$0.00",
        PARTICIPANT_TRIP_DONATIONS_TOTAL: "$0.00",
      });
    });

    it("Existing amount owed is unchanged", async () => {
      await addTokens([["PARTICIPANT_AMOUNT_OWED", "participant.amountOwed"]]);
      await addTripOption("Single room", 200);
      await addDonation(300, "2026-10-01T17:00:00Z", "mary@example.org");

      const values = await sendTokens(["PARTICIPANT_AMOUNT_OWED"]);

      expect(values.PARTICIPANT_AMOUNT_OWED).toBe("$1,200.00");
    });

    it("Token seed adds the financial tokens", async () => {
      await seedEmailTokens();

      const rows = await db.emailToken.findAll({
        where: { tokenCode: FINANCIAL_TOKENS.map(([code]) => code) },
      });
      expect(Object.fromEntries(rows.map((row) => [row.tokenCode, row.valueSource]))).toEqual(
        Object.fromEntries(FINANCIAL_TOKENS)
      );
    });

    it("Seed adds the financial statement template", async () => {
      const seedOrg = await db.organization.create({
        name: "Health Talents International",
        email: "info@example.org",
      });

      await seedEmailTypes();
      await seedEmailTokens();
      await seedEmailTemplates();

      const emailType = await db.emailType.findOne({ where: { typeCode: "financial-statement" } });
      expect(emailType.eventCode).toBe("team-email");
      const template = await db.emailTemplate.findOne({
        where: { orgId: seedOrg.id, tripId: null, emailTypeId: emailType.id },
      });
      expect(template.functionCode).toBe("Trip Participant");
      expect(template.fromEmail).toBe("{{ORG_EMAIL}}");
      expect(template.toAddress).toBe("{{PARTICIPANT_EMAIL}}");
      expect(template.subject).toBe("Your {{TRIP_NAME}} financial statement");
      const bodyTokens = [
        "TRIP_NAME",
        "TRIP_LOCATION",
        "TRIP_START_DATE",
        "TRIP_END_DATE",
        ...FINANCIAL_TOKENS.map(([code]) => code),
      ];
      for (const code of bodyTokens) {
        expect(template.emailBody).toContain(`{{${code}}}`);
      }
    });
  });
});
