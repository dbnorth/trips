import db from "../models/index.js";
import {
  getOrgRolesForOrg,
  isOrgAdminForOrg,
  isSystemAdmin,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
} from "../authorization/accessControl.js";

const MedicalCondition = db.medicalCondition;
const Organization = db.organization;

const conditionIncludes = [
  { model: Organization, as: "organization", attributes: ["id", "name"] },
];

const getOrgAdminOrgIds = (req) => [
  ...new Set(
    (req.user?.orgRoles || [])
      .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
      .map((r) => Number(r.orgId))
  ),
];

const resolveOrgId = (req, bodyOrgId) => {
  if (bodyOrgId != null && bodyOrgId !== "") {
    return Number(bodyOrgId);
  }
  const scoped = parseOrganizationScopeHeader(req);
  if (isSystemAdmin(req)) return scoped;
  const adminOrgIds = getOrgAdminOrgIds(req);
  if (scoped != null && adminOrgIds.includes(scoped)) return scoped;
  if (adminOrgIds.length === 1) return adminOrgIds[0];
  return scoped ?? adminOrgIds[0] ?? null;
};

const canManageOrg = (req, orgId) => isOrgAdminForOrg(req, orgId);

/** Applicants with any org membership may list the catalog for that org (FR list access). */
const canReadOrgCatalog = (req, orgId) => {
  if (isSystemAdmin(req)) {
    const acting = parseOrganizationScopeHeader(req);
    if (acting == null) return true;
    return Number(acting) === Number(orgId);
  }
  return getOrgRolesForOrg(req, orgId).length > 0;
};

const normalizeName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const loadCondition = (id) =>
  MedicalCondition.findByPk(id, {
    include: conditionIncludes,
  });

const findDuplicateName = async (orgId, name, excludeId = null) => {
  const rows = await MedicalCondition.findAll({ where: { orgId } });
  const target = name.toLowerCase();
  return rows.find((row) => {
    if (excludeId != null && Number(row.id) === Number(excludeId)) return false;
    return String(row.name).toLowerCase() === target;
  });
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const orgId = resolveOrgId(req, req.query.orgId);
    if (!orgId) {
      if (isSystemAdmin(req)) return res.send([]);
      return res.status(400).send({ message: "Organization is required." });
    }
    if (!canReadOrgCatalog(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const data = await MedicalCondition.findAll({
      where: { orgId },
      include: conditionIncludes,
      order: [["name", "ASC"]],
    });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const condition = await loadCondition(req.params.id);
    if (!condition) return res.status(404).send({ message: "Medical condition not found." });
    if (!canReadOrgCatalog(req, condition.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    res.send(condition);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const orgId = resolveOrgId(req, req.body.orgId ?? req.body.organizationId);
    if (!orgId) {
      return res.status(400).send({ message: "Organization is required." });
    }
    if (!canManageOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const name = normalizeName(req.body.name);
    if (!name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (name.length > 50) {
      return res.status(400).send({ message: "Name must be at most 50 characters." });
    }

    const duplicate = await findDuplicateName(orgId, name);
    if (duplicate) {
      return res.status(409).send({ message: "A medical condition with this name already exists for the organization." });
    }

    const data = await MedicalCondition.create({ orgId, name });
    res.send(await loadCondition(data.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const condition = await MedicalCondition.findByPk(req.params.id);
    if (!condition) return res.status(404).send({ message: "Medical condition not found." });
    if (!canManageOrg(req, condition.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    if (!Object.prototype.hasOwnProperty.call(req.body, "name")) {
      return res.send(await loadCondition(condition.id));
    }

    const name = normalizeName(req.body.name);
    if (!name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (name.length > 50) {
      return res.status(400).send({ message: "Name must be at most 50 characters." });
    }

    const duplicate = await findDuplicateName(condition.orgId, name, condition.id);
    if (duplicate) {
      return res.status(409).send({ message: "A medical condition with this name already exists for the organization." });
    }

    await condition.update({ name });
    res.send(await loadCondition(condition.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const condition = await MedicalCondition.findByPk(req.params.id);
    if (!condition) return res.status(404).send({ message: "Medical condition not found." });
    if (!canManageOrg(req, condition.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    await condition.destroy();
    res.send({ message: "Medical condition deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
