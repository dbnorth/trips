import "dotenv/config";
import db from "../models/index.js";
import logger from "../config/logger.js";
import { isValidJobDate, runScheduledEmails, todayInTimeZone } from "../utils/scheduledEmails.js";

const args = process.argv.slice(2);
const dateArg = args.find((arg) => arg.startsWith("--date="))?.slice("--date=".length);
const dryRun = args.includes("--dry-run");

if (dateArg !== undefined && !isValidJobDate(dateArg)) {
  console.error(`--date must be a real date written YYYY-MM-DD (got "${dateArg}").`);
  process.exit(1);
}

const date = dateArg ?? todayInTimeZone(process.env.SCHEDULED_EMAIL_TIMEZONE || "America/Chicago");

try {
  await db.sequelize.authenticate();
  await runScheduledEmails({ date, dryRun });
  await db.sequelize.close();
  process.exit(0);
} catch (err) {
  logger.error(`Scheduled emails for ${date} stopped: ${err.message}`);
  console.error(err);
  process.exit(1);
}
