import db from "../models/index.js";
import {
  isSystemAdmin,
  ROLE_ORG_ADMIN,
  ROLE_TRIP_LEADER,
} from "../authorization/accessControl.js";

const EmailType = db.emailType;
const EmailTemplate = db.emailTemplate;

const requireSystemAdmin = (req, res) => {
  if (!isSystemAdmin(req)) {
    res.status(403).send({ message: "Forbidden." });
    return false;
  }
  return true;
};

const canReadEmailTypes = (req) => {
  if (isSystemAdmin(req)) return true;
  if ((req.user?.orgRoles || []).some((r) => r.role?.roleName === ROLE_ORG_ADMIN)) return true;
  return (req.user?.tripRoles || []).some(
    (r) => r.role?.roleName === ROLE_TRIP_LEADER && r.status === "approved"
  );
};

const trimField = (value) => (typeof value === "string" ? value.trim() : "");

const pickPayload = (body) => ({
  typeCode: trimField(body.typeCode),
  description: trimField(body.description),
  eventCode: trimField(body.eventCode),
});

const missingField = (payload) => {
  if (!payload.typeCode) return "Type code is required.";
  if (!payload.description) return "Description is required.";
  if (!payload.eventCode) return "Event code is required.";
  return null;
};

const duplicateTypeCode = async (typeCode, exceptId = null) => {
  const existing = await EmailType.findOne({ where: { typeCode } });
  if (!existing) return false;
  if (exceptId != null && Number(existing.id) === Number(exceptId)) return false;
  return true;
};

const sendUniqueOrError = (err, res) => {
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).send({ message: "Type code is already used." });
  }
  return res.status(500).send({ message: err.message });
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    if (!canReadEmailTypes(req)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const data = await EmailType.findAll({
      order: [
        ["description", "ASC"],
        ["typeCode", "ASC"],
      ],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailType.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Email type not found." });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const payload = pickPayload(req.body);
    const missing = missingField(payload);
    if (missing) return res.status(400).send({ message: missing });
    if (await duplicateTypeCode(payload.typeCode)) {
      return res.status(400).send({ message: "Type code is already used." });
    }
    const data = await EmailType.create(payload);
    res.send(data);
  } catch (err) {
    sendUniqueOrError(err, res);
  }
};

exports.update = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailType.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Email type not found." });
    const payload = pickPayload(req.body);
    const missing = missingField(payload);
    if (missing) return res.status(400).send({ message: missing });
    if (await duplicateTypeCode(payload.typeCode, row.id)) {
      return res.status(400).send({ message: "Type code is already used." });
    }
    await row.update(payload);
    res.send(await EmailType.findByPk(row.id));
  } catch (err) {
    sendUniqueOrError(err, res);
  }
};

exports.delete = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailType.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Email type not found." });
    const used = await EmailTemplate.count({ where: { emailTypeId: row.id } });
    if (used) {
      return res.status(400).send({ message: "Email type is used by a template." });
    }
    await row.destroy();
    res.send({ message: "Email type deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
