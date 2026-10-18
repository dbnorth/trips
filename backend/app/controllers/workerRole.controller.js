import db from "../models/index.js";
import {
  canAccessOrg,
  isOrgAdminForOrg,
  isSystemAdmin,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
} from "../authorization/accessControl.js";

const WorkerRole = db.workerRole;
const Organization = db.organization;
const DocumentType = db.documentType;
const WorkerRoleDocumentType = db.workerRoleDocumentType;
const WorkerRoleSpecialization = db.workerRoleSpecialization;
const DocumentTypeSpecialization = db.documentTypeSpecialization;
const STATUSES = ["active", "inactive"];
const SPECIALIZATION_NOT_REQUIRED_DOCUMENT =
  "Required specializations must belong to a required document.";

const requiredDocumentTypeInclude = {
  model: DocumentType,
  as: "requiredDocumentTypes",
  attributes: ["id", "description", "type"],
  through: { attributes: [] },
};

const requiredSpecializationInclude = {
  model: DocumentTypeSpecialization,
  as: "requiredSpecializations",
  attributes: ["id", "name", "documentTypeId"],
  through: { attributes: [] },
};

const roleIncludes = [
  { model: Organization, as: "organization", attributes: ["id", "name"] },
  { model: DocumentType, as: "documentType", attributes: ["id", "description", "type"] },
  requiredDocumentTypeInclude,
  requiredSpecializationInclude,
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

const formatRole = (role) => {
  if (!role) return role;
  const json = typeof role.toJSON === "function" ? role.toJSON() : { ...role };
  const required = json.requiredDocumentTypes || [];
  json.requiredDocumentTypeIds = required.map((d) => d.id);
  json.requiredSpecializationIds = (json.requiredSpecializations || []).map((s) => s.id);
  return json;
};

const loadRole = async (id) => {
  const role = await WorkerRole.findByPk(id, {
    include: roleIncludes,
  });
  return role ? formatRole(role) : null;
};

const pickPayload = (body) => {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    payload.name = typeof body.name === "string" ? body.name.trim() : body.name;
  }
  if (Object.prototype.hasOwnProperty.call(body, "description")) {
    const val = body.description;
    payload.description = typeof val === "string" ? val.trim() || null : val ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(body, "licenseRequired")) {
    payload.licenseRequired = !!body.licenseRequired;
  }
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    payload.status = body.status;
  }
  return payload;
};

const parseRequiredDocumentTypeIds = (body) => {
  if (Object.prototype.hasOwnProperty.call(body, "requiredDocumentTypeIds")) {
    const raw = body.requiredDocumentTypeIds;
    if (raw == null) return { provided: true, ids: [] };
    if (!Array.isArray(raw)) {
      return { error: "requiredDocumentTypeIds must be an array." };
    }
    const ids = [
      ...new Set(
        raw
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
    ];
    return { provided: true, ids };
  }
  // Backward-compatible: single legacy documentTypeId when list omitted.
  if (
    Object.prototype.hasOwnProperty.call(body, "documentTypeId") &&
    body.documentTypeId != null &&
    body.documentTypeId !== ""
  ) {
    const id = Number(body.documentTypeId);
    if (!Number.isInteger(id) || id < 1) {
      return { error: "Document type not found." };
    }
    return { provided: true, ids: [id] };
  }
  return { provided: false, ids: [] };
};

const validateDocumentTypeIds = async (ids) => {
  if (!ids.length) return { ok: true };
  const found = await DocumentType.findAll({
    where: { id: ids },
    attributes: ["id"],
  });
  if (found.length !== ids.length) {
    return { ok: false, message: "Document type not found." };
  }
  return { ok: true };
};

const syncRequiredDocumentTypes = async (workerRoleId, ids) => {
  await WorkerRoleDocumentType.destroy({ where: { workerRoleId } });
  if (!ids.length) return;
  await WorkerRoleDocumentType.bulkCreate(
    ids.map((documentTypeId) => ({ workerRoleId, documentTypeId }))
  );
};

const parseRequiredSpecializationIds = (body) => {
  if (!Object.prototype.hasOwnProperty.call(body, "requiredSpecializationIds")) {
    return { provided: false, ids: [] };
  }
  const raw = body.requiredSpecializationIds;
  if (raw == null) return { provided: true, ids: [] };
  if (!Array.isArray(raw)) return { error: "requiredSpecializationIds must be an array." };
  const ids = [...new Set(raw.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
  return { provided: true, ids };
};

/** Every specialization must exist and belong to one of the role's required document types. */
const validateRequiredSpecializationIds = async (ids, requiredDocumentTypeIds) => {
  if (!ids.length) return { ok: true };
  const found = await DocumentTypeSpecialization.findAll({
    where: { id: ids },
    attributes: ["id", "documentTypeId"],
  });
  const allowed = new Set(requiredDocumentTypeIds.map(Number));
  if (found.length !== ids.length || found.some((s) => !allowed.has(Number(s.documentTypeId)))) {
    return { ok: false, message: SPECIALIZATION_NOT_REQUIRED_DOCUMENT };
  }
  return { ok: true };
};

const syncRequiredSpecializations = async (workerRoleId, ids) => {
  await WorkerRoleSpecialization.destroy({ where: { workerRoleId } });
  if (!ids.length) return;
  await WorkerRoleSpecialization.bulkCreate(
    ids.map((documentTypeSpecializationId) => ({ workerRoleId, documentTypeSpecializationId }))
  );
};

/** Drop required specializations whose document type is no longer required. */
const pruneRequiredSpecializations = async (workerRoleId, requiredDocumentTypeIds) => {
  const rows = await WorkerRoleSpecialization.findAll({
    where: { workerRoleId },
    include: [{ model: DocumentTypeSpecialization, as: "documentTypeSpecialization", attributes: ["documentTypeId"] }],
  });
  const allowed = new Set(requiredDocumentTypeIds.map(Number));
  for (const row of rows) {
    if (!allowed.has(Number(row.documentTypeSpecialization?.documentTypeId))) await row.destroy();
  }
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const orgId = resolveOrgId(req, req.query.orgId);
    if (!orgId) {
      if (isSystemAdmin(req)) return res.send([]);
      return res.status(400).send({ message: "Organization is required." });
    }
    if (!canAccessOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const where = { orgId };
    if (req.query.status && STATUSES.includes(req.query.status)) {
      where.status = req.query.status;
    }

    const data = await WorkerRole.findAll({
      where,
      include: roleIncludes,
      order: [
        ["status", "ASC"],
        ["name", "ASC"],
      ],
    });
    res.send(data.map(formatRole));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const role = await loadRole(req.params.id);
    if (!role) return res.status(404).send({ message: "Worker role not found." });
    if (!canManageOrg(req, role.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    res.send(role);
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

    const payload = pickPayload(req.body);
    if (!payload.name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (payload.status != null && !STATUSES.includes(payload.status)) {
      return res.status(400).send({ message: "Status must be active or inactive." });
    }

    const required = parseRequiredDocumentTypeIds(req.body);
    if (required.error) return res.status(400).send({ message: required.error });
    const requiredIds = required.provided ? required.ids : [];
    const docCheck = await validateDocumentTypeIds(requiredIds);
    if (!docCheck.ok) return res.status(400).send({ message: docCheck.message });
    const specializations = parseRequiredSpecializationIds(req.body);
    if (specializations.error) return res.status(400).send({ message: specializations.error });
    const specCheck = await validateRequiredSpecializationIds(specializations.ids, requiredIds);
    if (!specCheck.ok) return res.status(400).send({ message: specCheck.message });

    const data = await WorkerRole.create({
      orgId,
      name: payload.name,
      description: payload.description ?? null,
      licenseRequired: payload.licenseRequired ?? false,
      documentTypeId: null,
      status: payload.status ?? "active",
    });
    await syncRequiredDocumentTypes(data.id, requiredIds);
    await syncRequiredSpecializations(data.id, specializations.ids);
    res.send(await loadRole(data.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const role = await WorkerRole.findByPk(req.params.id);
    if (!role) return res.status(404).send({ message: "Worker role not found." });
    if (!canManageOrg(req, role.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const payload = pickPayload(req.body);
    if (Object.prototype.hasOwnProperty.call(payload, "name") && !payload.name) {
      return res.status(400).send({ message: "Name is required." });
    }
    if (payload.status != null && !STATUSES.includes(payload.status)) {
      return res.status(400).send({ message: "Status must be active or inactive." });
    }

    // Stop writing legacy documentTypeId on updates.
    payload.documentTypeId = null;

    const required = parseRequiredDocumentTypeIds(req.body);
    if (required.error) return res.status(400).send({ message: required.error });
    if (required.provided) {
      const docCheck = await validateDocumentTypeIds(required.ids);
      if (!docCheck.ok) return res.status(400).send({ message: docCheck.message });
    }
    const specializations = parseRequiredSpecializationIds(req.body);
    if (specializations.error) return res.status(400).send({ message: specializations.error });
    const requiredIds = required.provided
      ? required.ids
      : (await WorkerRoleDocumentType.findAll({ where: { workerRoleId: role.id } })).map(
          (row) => row.documentTypeId
        );
    if (specializations.provided) {
      const specCheck = await validateRequiredSpecializationIds(specializations.ids, requiredIds);
      if (!specCheck.ok) return res.status(400).send({ message: specCheck.message });
    }

    await role.update(payload);
    if (required.provided) {
      await syncRequiredDocumentTypes(role.id, required.ids);
    }
    if (specializations.provided) {
      await syncRequiredSpecializations(role.id, specializations.ids);
    } else if (required.provided) {
      await pruneRequiredSpecializations(role.id, required.ids);
    }
    res.send(await loadRole(role.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const role = await WorkerRole.findByPk(req.params.id);
    if (!role) return res.status(404).send({ message: "Worker role not found." });
    if (!canManageOrg(req, role.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    await role.destroy();
    res.send({ message: "Worker role deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
