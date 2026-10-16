import "dotenv/config";
import db from "../models/index.js";

const emailTypes = [
  { typeCode: "apply-started", description: "Application started", eventCode: "application-started" },
  { typeCode: "apply-incomplete", description: "Application incomplete reminder", eventCode: "application-incomplete" },
  { typeCode: "apply-received", description: "Application received", eventCode: "application-submitted" },
  { typeCode: "apply-approved", description: "Application approved", eventCode: "application-approved" },
  { typeCode: "deposit-due", description: "Deposit due", eventCode: "deposit-due" },
  { typeCode: "deposit-received", description: "Deposit received", eventCode: "deposit-received" },
  { typeCode: "payment-due", description: "Payment due reminder", eventCode: "payment-due" },
  { typeCode: "payment-complete", description: "Trip fully paid", eventCode: "payment-complete" },
  { typeCode: "donation-received", description: "Donation received", eventCode: "donation-received" },
  { typeCode: "pre-departure", description: "Pre-departure information", eventCode: "pre-departure" },
  { typeCode: "team-update", description: "Trip team update", eventCode: "team-email" },
];

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.emailType.sync();

    let inserted = 0;
    for (const { typeCode, description, eventCode } of emailTypes) {
      const [, created] = await db.emailType.findOrCreate({
        where: { typeCode },
        defaults: { description, eventCode },
      });
      if (created) inserted += 1;
    }

    console.log(
      `Email types: ${emailTypes.length} in seed list, ${emailTypes.length - inserted} already present, ${inserted} inserted.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
