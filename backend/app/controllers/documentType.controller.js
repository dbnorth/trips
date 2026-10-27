import db from "../models/index.js";
import { isOrgAdminForOrg, isSystemAdmin } from "../authorization/accessControl.js";
import { canManagePerson } from "./personDocument.controller.js";

const DocumentType = db.documentType;
const DocumentTypeSpecialization = db.documentTypeSpecialization;
const SPECIALIZATION_NAME_MAX = 100;
const DOCUMENT_TYPES = ["medical_licence", "passport", "certification", "diploma"];
const DOCUMENT_TYPE_MESSAGE =
  "Type must be medical_licence, passport, certification, or diploma.";

const requireOrgAdmin = (req, res, orgId) => {
  if (!isOrgAdminForOrg(req, orgId)) {
    res.status(403).send({ message: "Forbidden." });
    return false;
  }
  return true;
};

const hasValue = (value) => value != null && value !== "";

const pickPayload = (body) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const val = body.description;
    payload.description = typeof val === "string" ? val.trim() : val;
  }
  if (Object.prototype.hasOwnProperty.call(body, "type")) {
    payload.type = body.type;
  }
  if (Object.prototype.hasOwnProperty.call(body, "documentNumberRequired")) {
    payload.documentNumberRequired =
      body.documentNumberRequired === true ||
      body.documentNumberRequired === "true" ||
      body.documentNumberRequired === 1 ||
      body.documentNumberRequired === "1";
  }
  if (Object.prototype.hasOwnProperty.call(body, "allowSpecialization")) {
    payload.allowSpecialization =
      body.allowSpecialization === true ||
      body.allowSpecialization === "true" ||
      body.allowSpecialization === 1 ||
      body.allowSpecialization === "1";
  }
  if (Object.prototype.hasOwnProperty.call(body, "hasExpirationDate")) {
    payload.hasExpirationDate =
      body.hasExpirationDate === true ||
      body.hasExpirationDate === "true" ||
      body.hasExpirationDate === 1 ||
      body.hasExpirationDate === "1";
  }
  if (Object.prototype.hasOwnProperty.call(body, "instructions")) {
    const val = body.instructions;
    if (val == null) payload.instructions = null;
    else if (typeof val === "string") {
      const trimmed = val.trim();
      payload.instructions = trimmed || null;
    } else {
      payload.instructions = null;
    }
  }
  return payload;
};

/** Submitted specialization list as [{ id, name }], or { error }; undefined when not sent. */
const parseSpecializations = (body) => {
  if (!Object.prototype.hasOwnProperty.call(body, "specializations")) return undefined;
  if (!Array.isArray(body.specializations)) return { error: "Specializations must be a list." };
  const list = [];
  const seen = new Set();
  for (const entry of body.specializations) {
    const name = String(entry?.name ?? "").trim();
    if (!name) return { error: "Specialization name is required." };
    if (name.length > SPECIALIZATION_NAME_MAX) {
      return { error: `Specialization names must be ${SPECIALIZATION_NAME_MAX} characters or fewer.` };
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: "Specialization names must be unique." };
    seen.add(key);
    const id = entry?.id == null || entry.id === "" ? null : Number(entry.id);
    list.push({ id, name });
  }
  return { list };
};

const specializationsInclude = {
  model: DocumentTypeSpecialization,
  as: "specializations",
  attributes: ["id", "name"],
};
const specializationsOrder = [{ model: DocumentTypeSpecialization, as: "specializations" }, "name", "ASC"];
const organizationInclude = { model: db.organization, as: "organization", attributes: ["id", "name"] };

const loadDocumentType = (id) =>
  DocumentType.findByPk(id, { include: [specializationsInclude], order: [specializationsOrder] });

const isSpecializationInUse = async (specializationId) =>
  (await db.personDocumentSpecialization.count({
    where: { documentTypeSpecializationId: specializationId },
  })) > 0 ||
  (await db.workerRoleSpecialization.count({
    where: { documentTypeSpecializationId: specializationId },
  })) > 0;

/** Replace the type's list: keep (and rename) entries sent with an id, add new ones, remove the rest. */
const replaceSpecializations = async (documentTypeId, list, transaction) => {
  const existing = await DocumentTypeSpecialization.findAll({
    where: { documentTypeId },
    transaction,
  });
  const existingById = new Map(existing.map((row) => [Number(row.id), row]));
  for (const entry of list) {
    if (entry.id != null && !existingById.has(entry.id)) {
      return { error: "Specialization not found." };
    }
  }
  const keptIds = new Set(list.filter((entry) => entry.id != null).map((entry) => entry.id));
  const removed = existing.filter((row) => !keptIds.has(Number(row.id)));
  for (const row of removed) {
    if (await isSpecializationInUse(row.id)) {
      return { error: `${row.name} is in use and cannot be removed.` };
    }
  }
  for (const row of removed) await row.destroy({ transaction });
  for (const entry of list) {
    if (entry.id != null) {
      await existingById.get(entry.id).update({ name: entry.name }, { transaction });
    } else {
      await DocumentTypeSpecialization.create({ documentTypeId, name: entry.name }, { transaction });
    }
  }
  return {};
};

const NEEDS_SPECIALIZATION = "Add at least one specialization.";

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.type && DOCUMENT_TYPES.includes(req.query.type)) {
      where.type = req.query.type;
    }
    let include = [specializationsInclude];
    let order = [["type", "ASC"], ["description", "ASC"], specializationsOrder];

    if (hasValue(req.query.orgId)) {
      where.orgId = Number(req.query.orgId);
    } else if (hasValue(req.query.personId)) {
      if (!(await canManagePerson(req, req.query.personId))) {
        return res.status(403).send({ message: "Forbidden." });
      }
      const links = await db.orgPeopleRole.findAll({
        where: { peopleId: Number(req.query.personId) },
        attributes: ["orgId"],
      });
      where.orgId = [...new Set(links.map((link) => Number(link.orgId)))];
      include = [organizationInclude, specializationsInclude];
      order = [
        [{ model: db.organization, as: "organization" }, "name", "ASC"],
        ["description", "ASC"],
        specializationsOrder,
      ];
    } else if (isSystemAdmin(req)) {
      include = [organizationInclude, specializationsInclude];
    } else {
      where.orgId = [...new Set((req.user?.orgRoles || []).map((r) => Number(r.orgId)))];
    }

    const data = await DocumentType.findAll({ where, include, order });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const row = await loadDocumentType(req.params.id);
    if (!row) return res.status(404).send({ message: "Document type not found." });
    if (!requireOrgAdmin(req, res, row.orgId)) return;
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const orgId = Number(req.body.orgId);
    if (!hasValue(req.body.orgId) || !Number.isInteger(orgId) || orgId < 1) {
      return res.status(400).send({ message: "Organization is required." });
    }
    if (!requireOrgAdmin(req, res, orgId)) return;

    const payload = pickPayload(req.body);
    if (!payload.description) {
      return res.status(400).send({ message: "Description is required." });
    }
    if (!payload.type || !DOCUMENT_TYPES.includes(payload.type)) {
      return res.status(400).send({
        message: DOCUMENT_TYPE_MESSAGE,
      });
    }
    const specializations = parseSpecializations(req.body);
    if (specializations?.error) return res.status(400).send({ message: specializations.error });
    const list = specializations?.list || [];
    if (payload.allowSpecialization && !list.length) {
      return res.status(400).send({ message: NEEDS_SPECIALIZATION });
    }

    const id = await db.sequelize.transaction(async (transaction) => {
      const data = await DocumentType.create(
        {
          orgId,
          description: payload.description,
          type: payload.type,
          documentNumberRequired: payload.documentNumberRequired ?? false,
          allowSpecialization: payload.allowSpecialization ?? false,
          hasExpirationDate: payload.hasExpirationDate ?? true,
          instructions: Object.prototype.hasOwnProperty.call(payload, "instructions")
            ? payload.instructions
            : null,
        },
        { transaction }
      );
      for (const entry of list) {
        await DocumentTypeSpecialization.create(
          { documentTypeId: data.id, name: entry.name },
          { transaction }
        );
      }
      return data.id;
    });
    res.send(await loadDocumentType(id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await DocumentType.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Document type not found." });
    if (!requireOrgAdmin(req, res, row.orgId)) return;

    const payload = pickPayload(req.body);
    if (Object.prototype.hasOwnProperty.call(payload, "description") && !payload.description) {
      return res.status(400).send({ message: "Description is required." });
    }
    if (
      Object.prototype.hasOwnProperty.call(payload, "type") &&
      !DOCUMENT_TYPES.includes(payload.type)
    ) {
      return res.status(400).send({
        message: DOCUMENT_TYPE_MESSAGE,
      });
    }
    const specializations = parseSpecializations(req.body);
    if (specializations?.error) return res.status(400).send({ message: specializations.error });
    if (specializations || Object.prototype.hasOwnProperty.call(payload, "allowSpecialization")) {
      const allow = payload.allowSpecialization ?? row.allowSpecialization;
      const count = specializations
        ? specializations.list.length
        : await DocumentTypeSpecialization.count({ where: { documentTypeId: row.id } });
      if (allow && !count) return res.status(400).send({ message: NEEDS_SPECIALIZATION });
    }

    const transaction = await db.sequelize.transaction();
    try {
      await row.update(payload, { transaction });
      if (specializations) {
        const result = await replaceSpecializations(row.id, specializations.list, transaction);
        if (result.error) {
          await transaction.rollback();
          return res.status(400).send({ message: result.error });
        }
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      if (err.name === "SequelizeUniqueConstraintError") {
        return res.status(400).send({ message: "Specialization names must be unique." });
      }
      throw err;
    }
    res.send(await loadDocumentType(row.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await DocumentType.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Document type not found." });
    if (!requireOrgAdmin(req, res, row.orgId)) return;
    await row.destroy();
    res.send({ message: "Document type deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
