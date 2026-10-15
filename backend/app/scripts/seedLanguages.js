import "dotenv/config";
import db from "../models/index.js";
import { ensureSchema } from "./ensureSchema.js";

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.language.sync();
    await db.personLanguage.sync();
    await ensureSchema();
    const rows = await db.language.findAll({ order: [["name", "ASC"]] });
    console.log(`Languages seeded: ${rows.length}`);
    for (const row of rows) {
      console.log(`  ${row.code}  ${row.name}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
