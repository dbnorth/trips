import db from "../models/index.js";

/** IDs in the person's encrypted medical condition list (all organizations). */
export const readMedicalConditionIds = async (personId) => {
  const row = await db.person.unscoped().findByPk(personId, {
    attributes: ["id", "medicalConditionIds"],
  });
  return row?.medicalConditionIds || [];
};

export const saveMedicalConditionIds = async (personId, ids) => {
  await db.person.update({ medicalConditionIds: ids }, { where: { id: personId } });
};

/** The person's conditions still on an organization's list, optionally for one organization. */
export const loadMedicalConditions = async (personId, orgId = null) => {
  const ids = await readMedicalConditionIds(personId);
  if (!ids.length) return [];
  const where = { id: ids };
  if (orgId != null && orgId !== "") {
    const orgNum = Number(orgId);
    if (Number.isNaN(orgNum)) return [];
    where.orgId = orgNum;
  }
  const rows = await db.medicalCondition.findAll({
    where,
    attributes: ["id", "name", "orgId"],
    order: [["id", "ASC"]],
  });
  return rows.map((c) => ({ id: c.id, name: c.name, orgId: c.orgId }));
};
