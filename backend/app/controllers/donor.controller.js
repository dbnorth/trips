import db from "../models/index.js";
import {
  isSystemAdmin,
  parseOrganizationScopeHeader,
  ROLE_ORG_ADMIN,
} from "../authorization/accessControl.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { normalizeEmail } from "../utils/userPerson.js";
import { donorDetailsFromPerson, findDonatablePerson } from "../utils/donorPerson.js";
import { readDonorContactList } from "../utils/donorCsv.js";
import { donorDisplayName, donorNameFields, donorNameKey, donorSortKey } from "../utils/donorName.js";

const Donor = db.donor;
const Op = db.Sequelize.Op;
const fields = [
  "firstName",
  "lastName",
  "familyName",
  "organizationName",
  "addLine1",
  "addLine2",
  "city",
  "country",
  "state_prov",
  "postalCode",
  "phoneContryCode",
  "phoneNumber",
  "email",
  "status",
  "donorType",
];

const exports = {};

const FILE_MESSAGE = "Choose a CSV file up to 5 MB.";
const DONOR_TYPE_MESSAGE = "Donor type must be Organization or Individual.";

/** `undefined` when the body omits it, `null` when it is not Organization or Individual. */
const donorTypeFromBody = (body) => {
  if (!Object.prototype.hasOwnProperty.call(body, "donorType")) return undefined;
  if (body.donorType === "organization" || body.donorType === "individual") return body.donorType;
  return null;
};

const importedName = (parsed) => {
  if (parsed.donorType === "organization") {
    return {
      donorType: "organization",
      organizationName: parsed.organizationName,
      familyName: null,
      firstName: null,
      lastName: null,
    };
  }
  return {
    donorType: "individual",
    organizationName: null,
    familyName: parsed.familyName || null,
    firstName: parsed.firstName || null,
    lastName: parsed.lastName || null,
  };
};

const sourceKey = (value) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

const importDonorRows = async (orgId, rows, transaction) => {
  const donors = await Donor.findAll({ where: { orgId }, order: [["id", "ASC"]], transaction });
  const byEmail = new Map();
  const byName = new Map();
  const bySource = new Map();
  const remember = (donor) => {
    const email = normalizeEmail(donor.email);
    if (email) byEmail.set(email, donor);
    const key = donorNameKey(donor);
    if (!byName.has(key)) byName.set(key, donor);
    const addSource = (value) => {
      const stored = sourceKey(value);
      if (stored && !bySource.has(stored)) bySource.set(stored, donor);
    };
    addSource(donorDisplayName(donor));
    addSource(donor.organizationName);
    addSource(donor.familyName);
    addSource(donor.firstName);
    if (sourceKey(donor.firstName) && sourceKey(donor.lastName)) {
      addSource(`${sourceKey(donor.firstName)} ${sourceKey(donor.lastName)}`);
    }
  };
  const forget = (donor) => {
    const email = normalizeEmail(donor.email);
    if (email && byEmail.get(email) === donor) byEmail.delete(email);
    const key = donorNameKey(donor);
    if (byName.get(key) === donor) byName.delete(key);
    for (const [stored, found] of bySource) {
      if (found === donor) bySource.delete(stored);
    }
  };
  donors.forEach(remember);

  const summary = { rowCount: rows.length, added: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    if (!row.name) {
      summary.skipped += 1;
      continue;
    }
    const names = importedName(row.name);
    let donor = row.email ? byEmail.get(row.email) : null;
    if (!donor) donor = byName.get(donorNameKey(names)) || null;
    if (!donor) donor = bySource.get(sourceKey(row.name.sourceName)) || null;
    if (!donor) {
      donor = await Donor.create(
        {
          ...names,
          email: row.email,
          status: "active",
          orgId,
          ...(row.phone || {}),
          ...(row.address || {}),
        },
        { transaction }
      );
      remember(donor);
      summary.added += 1;
      continue;
    }
    forget(donor);
    const changes = {
      ...names,
      version: Number(donor.version) + 1,
    };
    if (row.email) changes.email = row.email;
    if (row.phone) Object.assign(changes, row.phone);
    if (row.address) Object.assign(changes, row.address);
    await donor.update(changes, { transaction });
    remember(donor);
    summary.updated += 1;
  }
  return summary;
};

/** The acting organization when the user may maintain its donors; otherwise sends the error and returns null. */
const loadActingOrgId = (req, res) => {
  const scoped = parseOrganizationScopeHeader(req);
  let orgId = scoped;
  if (!isSystemAdmin(req)) {
    const adminOrgIds = [
      ...new Set(
        (req.user?.orgRoles || [])
          .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
          .map((r) => Number(r.orgId))
      ),
    ];
    if (scoped == null && adminOrgIds.length === 1) orgId = adminOrgIds[0];
    if (!adminOrgIds.length || (orgId != null && !adminOrgIds.includes(orgId))) {
      res.status(403).send({ message: "Forbidden." });
      return null;
    }
  }
  if (orgId == null) {
    res.status(400).send({ message: "Select an organization in the menu bar." });
    return null;
  }
  return orgId;
};

const emailWhere = (orgId, emailNorm, exceptId = null) => {
  const where = {
    orgId,
    [Op.and]: [db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), emailNorm)],
  };
  if (exceptId != null) where.id = { [Op.ne]: exceptId };
  return where;
};

const duplicateEmail = (orgId, emailNorm, exceptId = null) =>
  emailNorm ? Donor.findOne({ where: emailWhere(orgId, emailNorm, exceptId) }) : null;

exports.findAll = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const data = await Donor.findAll({ where: { orgId } });
    data.sort((a, b) => donorSortKey(a).localeCompare(donorSortKey(b)) || a.id - b.id);
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.lookupByEmail = async (req, res) => {
  try {
    const emailNorm = normalizeEmail(req.query.email);
    if (!emailNorm) return res.status(400).send({ message: "Email is required." });

    let orgId;
    if (req.query.tripId) {
      const trip = await db.trip.findByPk(req.query.tripId, { attributes: ["orgId"] });
      if (!trip) return res.status(404).send({ message: "Donor not found." });
      orgId = trip.orgId;
    } else {
      orgId = loadActingOrgId(req, res);
      if (orgId == null) return;
    }

    const donor = await Donor.findOne({ where: emailWhere(orgId, emailNorm) });
    if (donor) return res.send({ ...donor.toJSON(), source: "donor" });

    const person = await findDonatablePerson(
      req,
      req.query.tripId,
      db.sequelize.where(db.sequelize.fn("LOWER", db.sequelize.col("email")), emailNorm)
    );
    if (!person) return res.status(404).send({ message: "Donor not found." });
    const linked = await Donor.findOne({ where: { personId: person.id, orgId } });
    if (linked) return res.send({ ...linked.toJSON(), source: "donor" });
    res.send({
      id: null,
      personId: person.id,
      ...donorDetailsFromPerson(person),
      status: "active",
      source: "person",
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.importDonors = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    if (!req.file) return res.status(400).send({ message: FILE_MESSAGE });
    const sheet = readDonorContactList(req.file.buffer.toString("utf8"));
    if (sheet.missing.length) {
      return res.status(400).send({
        message: `This file isn't a donor contact list. Missing columns: ${sheet.missing.join(", ")}.`,
      });
    }
    const summary = await db.sequelize.transaction((transaction) => importDonorRows(orgId, sheet.rows, transaction));
    res.send(summary);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const email = normalizeEmail(req.body.email);
    if (await duplicateEmail(orgId, email)) {
      return res.status(400).send({ message: "A donor with this email already exists." });
    }
    let donorType = donorTypeFromBody(req.body);
    if (donorType === undefined) donorType = "individual";
    if (donorType == null) return res.status(400).send({ message: DONOR_TYPE_MESSAGE });
    const names = donorNameFields(req.body, donorType);
    if (names.error) return res.status(400).send({ message: names.error });
    const payload = {};
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) payload[key] = req.body[key];
    }
    Object.assign(payload, names);
    payload.email = email;
    const data = await Donor.create({ ...payload, orgId });
    res.send(data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const orgId = loadActingOrgId(req, res);
    if (orgId == null) return;
    const donor = await Donor.findOne({ where: { id: req.params.id, orgId } });
    if (!donor) return res.status(404).send({ message: "Donor not found." });
    const requestedType = donorTypeFromBody(req.body);
    if (requestedType === null) return res.status(400).send({ message: DONOR_TYPE_MESSAGE });
    const names = donorNameFields(
      {
        firstName: donor.firstName,
        lastName: donor.lastName,
        familyName: donor.familyName,
        organizationName: donor.organizationName,
        ...req.body,
      },
      requestedType || donor.donorType
    );
    if (names.error) return res.status(400).send({ message: names.error });
    const email = Object.prototype.hasOwnProperty.call(req.body, "email")
      ? normalizeEmail(req.body.email)
      : undefined;
    if (email && (await duplicateEmail(orgId, email, donor.id))) {
      return res.status(400).send({ message: "A donor with this email already exists." });
    }
    const body = { ...req.body };
    if (email !== undefined) body.email = email;
    Object.assign(body, names);
    const result = await optimisticUpdate(Donor, donor.id, body, fields);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    res.send(result.data);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
