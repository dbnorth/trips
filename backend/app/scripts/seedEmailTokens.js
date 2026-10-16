import "dotenv/config";
import db from "../models/index.js";
import { VALUE_SOURCES } from "../utils/emailTokenValues.js";

const tokens = [
  { tokenCode: "ORG_NAME", valueSource: "organization.name" },
  { tokenCode: "ORG_EMAIL", valueSource: "organization.email" },
  { tokenCode: "ORG_PHONE", valueSource: "organization.phone" },
  { tokenCode: "ORG_WEBSITE", valueSource: "organization.websiteUrl" },
  { tokenCode: "TRIP_NAME", valueSource: "trip.name" },
  { tokenCode: "TRIP_LOCATION", valueSource: "trip.location" },
  { tokenCode: "TRIP_START_DATE", valueSource: "trip.startDate" },
  { tokenCode: "TRIP_END_DATE", valueSource: "trip.endDate" },
  { tokenCode: "TRIP_COST", valueSource: "trip.participantCost" },
  { tokenCode: "TRIP_DEPOSIT", valueSource: "trip.deposit" },
  { tokenCode: "PARTICIPANT_FIRST_NAME", valueSource: "participant.firstName" },
  { tokenCode: "PARTICIPANT_LAST_NAME", valueSource: "participant.lastName" },
  { tokenCode: "PARTICIPANT_PREFERRED_NAME", valueSource: "participant.preferredName" },
  { tokenCode: "PARTICIPANT_EMAIL", valueSource: "participant.email" },
  { tokenCode: "PARTICIPANT_AMOUNT_RAISED", valueSource: "participant.amountRaised" },
  { tokenCode: "PARTICIPANT_AMOUNT_OWED", valueSource: "participant.amountOwed" },
  { tokenCode: "PARTICIPANT_TRIP_ROLE", valueSource: "participant.tripRole" },
  { tokenCode: "LEADER_FIRST_NAME", valueSource: "primaryLeader.firstName" },
  { tokenCode: "LEADER_LAST_NAME", valueSource: "primaryLeader.lastName" },
  { tokenCode: "LEADER_PREFERRED_NAME", valueSource: "primaryLeader.preferredName" },
  { tokenCode: "LEADER_EMAIL", valueSource: "primaryLeader.email" },
  { tokenCode: "LEADER_PHONE", valueSource: "primaryLeader.phone" },
];

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.emailToken.sync();

    const labels = new Map(VALUE_SOURCES.map((s) => [s.valueSource, s.label]));
    let inserted = 0;
    for (const { tokenCode, valueSource } of tokens) {
      const description = labels.get(valueSource);
      if (!description) throw new Error(`Unknown value source ${valueSource} for ${tokenCode}.`);
      const [, created] = await db.emailToken.findOrCreate({
        where: { tokenCode },
        defaults: { description, valueSource },
      });
      if (created) inserted += 1;
    }

    console.log(
      `Email tokens: ${tokens.length} in seed list, ${tokens.length - inserted} already present, ${inserted} inserted.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
