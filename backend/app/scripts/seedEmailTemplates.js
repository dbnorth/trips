import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import db from "../models/index.js";
import { attachmentsAreValid, recipientsAreValid, senderIsValid } from "../utils/emailTokenValues.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "../data/emailTemplates.json");

/**
 * Add each seed template that is missing for the seed organization.
 * Returns null when the organization is not found, otherwise the counts.
 */
export const seedEmailTemplates = async () => {
  const { organizationName, templates } = JSON.parse(fs.readFileSync(dataFile, "utf8"));

  const org = await db.organization.findOne({ where: { name: organizationName } });
  if (!org) return { organizationName, org: null };

  let inserted = 0;
  let toAddressSet = 0;
  let scheduleSet = 0;
  for (const template of templates) {
    const emailType = await db.emailType.findOne({ where: { typeCode: template.typeCode } });
    if (!emailType) throw new Error(`Email type ${template.typeCode} not found. Run seedEmailTypes.js first.`);
    if (!(await senderIsValid(template.fromEmail))) {
      throw new Error(`From email "${template.fromEmail}" for ${template.typeCode} is not valid. Run seedEmailTokens.js first.`);
    }
    if (!(await recipientsAreValid(template.toAddress))) {
      throw new Error(`To "${template.toAddress}" for ${template.typeCode} is not valid. Run seedEmailTokens.js first.`);
    }
    if (!(await attachmentsAreValid(template.attachment))) {
      throw new Error(`Attachment "${template.attachment}" for ${template.typeCode} is not valid. Run seedEmailTokens.js first.`);
    }

    const [row, created] = await db.emailTemplate.findOrCreate({
      where: { orgId: org.id, tripId: null, emailTypeId: emailType.id },
      defaults: {
        functionCode: template.functionCode,
        fromEmail: template.fromEmail,
        toAddress: template.toAddress,
        subject: template.subject,
        emailBody: template.emailBody,
        attachment: template.attachment ?? null,
        scheduleRule: template.scheduleRule ?? null,
        scheduleDaysBefore: template.scheduleDaysBefore ?? null,
      },
    });
    if (created) {
      inserted += 1;
      continue;
    }
    if (!row.toAddress?.trim()) {
      await row.update({ toAddress: template.toAddress });
      toAddressSet += 1;
    }
    if (template.scheduleRule && row.functionCode === "Scheduled" && !row.scheduleRule) {
      await row.update({
        scheduleRule: template.scheduleRule,
        scheduleDaysBefore: template.scheduleDaysBefore ?? null,
      });
      scheduleSet += 1;
    }
  }

  return { organizationName, org, total: templates.length, inserted, toAddressSet, scheduleSet };
};

const run = async () => {
  try {
    await db.sequelize.authenticate();
    const result = await seedEmailTemplates();
    if (!result.org) {
      console.log(`Email templates: organization "${result.organizationName}" not found, skipped.`);
      process.exit(0);
    }
    console.log(
      `Email templates for ${result.organizationName}: ${result.total} in seed file, ${result.inserted} inserted, ${result.toAddressSet} existing given a To address, ${result.scheduleSet} existing given a schedule.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) run();
