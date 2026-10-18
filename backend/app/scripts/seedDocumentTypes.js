import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import db from "../models/index.js";
import { ensureSchema } from "./ensureSchema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, "../data/documentTypes.json");

/**
 * Add each seed document type that is missing (matched by description), then add missing
 * specializations (matched ignoring case) to types that allow specialization.
 */
export const seedDocumentTypes = async () => {
  const documentTypes = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  let typesInserted = 0;
  let specializationsInserted = 0;
  for (const { specializations, ...fields } of documentTypes) {
    const [documentType, created] = await db.documentType.findOrCreate({
      where: { description: fields.description },
      defaults: fields,
    });
    if (created) typesInserted += 1;
    if (!documentType.allowSpecialization) continue;
    const existing = await db.documentTypeSpecialization.findAll({
      where: { documentTypeId: documentType.id },
    });
    const have = new Set(existing.map((s) => s.name.toLowerCase()));
    for (const name of specializations) {
      if (have.has(name.toLowerCase())) continue;
      await db.documentTypeSpecialization.create({ documentTypeId: documentType.id, name });
      specializationsInserted += 1;
    }
  }
  return { total: documentTypes.length, typesInserted, specializationsInserted };
};

const run = async () => {
  try {
    await db.sequelize.authenticate();
    await db.documentType.sync();
    await db.documentTypeSpecialization.sync();
    await ensureSchema();
    const { total, typesInserted, specializationsInserted } = await seedDocumentTypes();
    console.log(
      `Document types: ${total} in seed list, ${total - typesInserted} already present, ${typesInserted} inserted; ${specializationsInserted} specialization(s) inserted.`
    );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) run();
