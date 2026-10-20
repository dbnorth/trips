import "dotenv/config";
import { pathToFileURL } from "url";
import db from "../models/index.js";
import { ensureSchema, ENCRYPTED_COLUMNS, tableExists } from "./ensureSchema.js";
import { loadPersonalDataKey } from "../utils/personalDataEncryption.js";
import { readMedicalConditionIds, saveMedicalConditionIds } from "../utils/personMedicalConditions.js";

const MODELS = {
  people: db.person,
  tripPeopleRoles: db.tripPeopleRole,
  personDocuments: db.personDocument,
  donors: db.donor,
};

const encryptColumn = async (table, column) => {
  const [rows] = await db.sequelize.query(
    `SELECT id, \`${column}\` AS value FROM \`${table}\`
     WHERE \`${column}\` IS NOT NULL AND \`${column}\` NOT LIKE 'enc1:%'`
  );
  for (const { id, value } of rows) {
    const row = MODELS[table].build({ id, [column]: value }, { raw: true, isNewRecord: false });
    row.set(column, row.get(column));
    await db.sequelize.query(`UPDATE \`${table}\` SET \`${column}\` = :encrypted WHERE id = :id`, {
      replacements: { encrypted: row.getDataValue(column), id },
    });
  }
  return rows.length;
};

const moveMedicalConditionLinks = async () => {
  if (!(await tableExists("personMedicalConditions"))) return 0;
  const [links] = await db.sequelize.query(
    "SELECT personId, medicalConditionId FROM personMedicalConditions"
  );
  const idsByPerson = new Map();
  for (const { personId, medicalConditionId } of links) {
    idsByPerson.set(personId, [...(idsByPerson.get(personId) || []), Number(medicalConditionId)]);
  }
  for (const [personId, ids] of idsByPerson) {
    await saveMedicalConditionIds(personId, [...(await readMedicalConditionIds(personId)), ...ids]);
  }
  await db.sequelize.query("DROP TABLE personMedicalConditions");
  return links.length;
};

/** Encrypt existing values and move medical condition links (Feature 64). Returns counts by name. */
export const encryptPersonalData = async () => {
  await loadPersonalDataKey();
  await ensureSchema();
  const counts = {};
  for (const [table, columns] of Object.entries(ENCRYPTED_COLUMNS)) {
    for (const column of columns) {
      counts[`${table}.${column}`] = await encryptColumn(table, column);
    }
  }
  counts["personMedicalConditions moved"] = await moveMedicalConditionLinks();
  return counts;
};

const run = async () => {
  try {
    await db.sequelize.authenticate();
    const counts = await encryptPersonalData();
    for (const [name, count] of Object.entries(counts)) console.log(`${name}: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) run();
