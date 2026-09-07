import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../models/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
const BATCH = 500;

const loadJson = (fileName) => {
  const full = path.join(dataDir, fileName);
  return JSON.parse(fs.readFileSync(full, "utf8"));
};

const upsertByCode = async (Model, rows, label) => {
  const existing = await Model.findAll({ attributes: ["code"] });
  const have = new Set(existing.map((r) => r.code));
  const missing = rows.filter((r) => !have.has(r.code));
  for (let i = 0; i < missing.length; i += BATCH) {
    await Model.bulkCreate(missing.slice(i, i + BATCH), { ignoreDuplicates: true });
  }
  console.log(
    `${label}: ${rows.length} in catalog file, ${have.size} already present, ${missing.length} inserted.`
  );
};

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.airport.sync();
    await db.airline.sync();

    const airports = loadJson("airports.json");
    const airlines = loadJson("airlines.json");
    await upsertByCode(db.airport, airports, "Airports");
    await upsertByCode(db.airline, airlines, "Airlines");

    console.log("Airport/airline seed complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
