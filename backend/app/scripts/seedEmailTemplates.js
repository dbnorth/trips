import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../models/index.js";
import { recipientsAreValid, senderIsValid } from "../utils/emailTokenValues.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "../data/emailTemplates.json");

const run = async () => {
  try {
    await db.sequelize.authenticate();
    const { organizationName, templates } = JSON.parse(fs.readFileSync(dataFile, "utf8"));

    const org = await db.organization.findOne({ where: { name: organizationName } });
    if (!org) {
      console.log(`Email templates: organization "${organizationName}" not found, skipped.`);
      process.exit(0);
    }

    let inserted = 0;
    let toAddressSet = 0;
    for (const template of templates) {
      const emailType = await db.emailType.findOne({ where: { typeCode: template.typeCode } });
      if (!emailType) throw new Error(`Email type ${template.typeCode} not found. Run seedEmailTypes.js first.`);
      if (!(await senderIsValid(template.fromEmail))) {
        throw new Error(`From email "${template.fromEmail}" for ${template.typeCode} is not valid. Run seedEmailTokens.js first.`);
      }
      if (!(await recipientsAreValid(template.toAddress))) {
        throw new Error(`To "${template.toAddress}" for ${template.typeCode} is not valid. Run seedEmailTokens.js first.`);
      }

      const [row, created] = await db.emailTemplate.findOrCreate({
        where: { orgId: org.id, tripId: null, emailTypeId: emailType.id },
        defaults: {
          functionCode: template.functionCode,
          fromEmail: template.fromEmail,
          toAddress: template.toAddress,
          subject: template.subject,
          emailBody: template.emailBody,
        },
      });
      if (created) {
        inserted += 1;
      } else if (!row.toAddress?.trim()) {
        await row.update({ toAddress: template.toAddress });
        toAddressSet += 1;
      }
    }

    console.log(
      `Email templates for ${organizationName}: ${templates.length} in seed file, ${inserted} inserted, ${toAddressSet} existing given a To address.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
