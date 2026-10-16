import db from "../models/index.js";
import {
  isSystemAdmin,
  ROLE_ORG_ADMIN,
  ROLE_TRIP_LEADER,
} from "../authorization/accessControl.js";
import {
  TOKEN_CODE_PATTERN,
  VALUE_SOURCES,
  VALUE_SOURCE_KEYS,
} from "../utils/emailTokenValues.js";

const EmailToken = db.emailToken;

const requireSystemAdmin = (req, res) => {
  if (!isSystemAdmin(req)) {
    res.status(403).send({ message: "Forbidden." });
    return false;
  }
  return true;
};

const canReadEmailTokens = (req) => {
  if (isSystemAdmin(req)) return true;
  if ((req.user?.orgRoles || []).some((r) => r.role?.roleName === ROLE_ORG_ADMIN)) return true;
  return (req.user?.tripRoles || []).some(
    (r) => r.role?.roleName === ROLE_TRIP_LEADER && r.status === "approved"
  );
};

const trimField = (value) => (typeof value === "string" ? value.trim() : "");

const pickPayload = (body) => ({
  tokenCode: trimField(body.tokenCode),
  description: trimField(body.description),
  valueSource: trimField(body.valueSource),
});

const invalidField = (payload) => {
  if (!payload.tokenCode) return "Token code is required.";
  if (!TOKEN_CODE_PATTERN.test(payload.tokenCode)) {
    return "Token code must start with a capital letter and use only capital letters, digits, and underscores.";
  }
  if (!payload.description) return "Description is required.";
  if (!payload.valueSource) return "Value source is required.";
  if (!VALUE_SOURCE_KEYS.has(payload.valueSource)) return "Value source is not supported.";
  return null;
};

const duplicateTokenCode = async (tokenCode, exceptId = null) => {
  const existing = await EmailToken.findOne({ where: { tokenCode } });
  if (!existing) return false;
  return exceptId == null || Number(existing.id) !== Number(exceptId);
};

const sendUniqueOrError = (err, res) => {
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).send({ message: "Token code is already used." });
  }
  return res.status(500).send({ message: err.message });
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    if (!canReadEmailTokens(req)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const data = await EmailToken.findAll({ order: [["tokenCode", "ASC"]] });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.valueSources = async (req, res) => {
  if (!requireSystemAdmin(req, res)) return;
  res.send(VALUE_SOURCES);
};

exports.findOne = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailToken.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Token not found." });
    res.send(row);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const payload = pickPayload(req.body);
    const invalid = invalidField(payload);
    if (invalid) return res.status(400).send({ message: invalid });
    if (await duplicateTokenCode(payload.tokenCode)) {
      return res.status(400).send({ message: "Token code is already used." });
    }
    res.send(await EmailToken.create(payload));
  } catch (err) {
    sendUniqueOrError(err, res);
  }
};

exports.update = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailToken.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Token not found." });
    const payload = pickPayload(req.body);
    const invalid = invalidField(payload);
    if (invalid) return res.status(400).send({ message: invalid });
    if (await duplicateTokenCode(payload.tokenCode, row.id)) {
      return res.status(400).send({ message: "Token code is already used." });
    }
    await row.update(payload);
    res.send(await EmailToken.findByPk(row.id));
  } catch (err) {
    sendUniqueOrError(err, res);
  }
};

exports.delete = async (req, res) => {
  try {
    if (!requireSystemAdmin(req, res)) return;
    const row = await EmailToken.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Token not found." });
    await row.destroy();
    res.send({ message: "Token deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
