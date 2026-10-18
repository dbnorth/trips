import db from "../models/index.js";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";
import {
  ROLE_OCCUPYING_STATUSES,
  loadOccupyingAssignments,
  normalizeEmail,
  withCapacityFields,
} from "../utils/tripRoleCapacity.js";

const TripWorkerRole = db.tripWorkerRole;
const TripWorkerRoleReservation = db.tripWorkerRoleReservation;
const WorkerRole = db.workerRole;
const TripPeopleRole = db.tripPeopleRole;
const { Op, fn, col, where } = db.Sequelize;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const workerRoleInclude = {
  model: WorkerRole,
  as: "workerRole",
  attributes: ["id", "name", "description", "licenseRequired", "documentTypeId", "status"],
  include: [
    { model: db.documentType, as: "documentType", attributes: ["id", "description", "type"] },
    {
      model: db.documentType,
      as: "requiredDocumentTypes",
      attributes: ["id", "description", "type"],
      through: { attributes: [] },
    },
  ],
};

const canManage = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return { ok: false, trip: null };
  const allowed =
    isOrgAdminForOrg(req, access.trip.orgId) ||
    isSystemAdmin(req) ||
    isTripLeaderForTrip(req, tripId);
  return { ok: allowed, trip: access.trip };
};

const parseQuantity = (value) => {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1) return null;
  return qty;
};

const parseEmails = (value) => (Array.isArray(value) ? value : []).map(normalizeEmail).filter(Boolean);

const loadOne = async (id) => {
  const row = await TripWorkerRole.findByPk(id, { include: [workerRoleInclude] });
  if (!row) return null;
  const [enriched] = await withCapacityFields(row.tripId, [row]);
  return enriched;
};

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    if (!tripId) return res.status(400).send({ message: "tripId query param required." });
    const access = await canAccessTrip(req, tripId);
    if (!access.ok) return res.status(403).send({ message: "Forbidden." });

    const data = await TripWorkerRole.findAll({
      where: { tripId },
      include: [workerRoleInclude],
      order: [[{ model: WorkerRole, as: "workerRole" }, "name", "ASC"]],
    });
    res.send(await withCapacityFields(tripId, data));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { tripId, workerRoleId } = req.body;
    if (!tripId || !workerRoleId) {
      return res.status(400).send({ message: "tripId and workerRoleId are required." });
    }
    const { ok, trip } = await canManage(req, tripId);
    if (!ok) return res.status(403).send({ message: "Forbidden." });

    const workerRole = await WorkerRole.findByPk(workerRoleId);
    if (!workerRole || Number(workerRole.orgId) !== Number(trip.orgId)) {
      return res
        .status(400)
        .send({ message: "Worker role must belong to the trip's organization." });
    }

    const quantity = parseQuantity(req.body.quantity ?? 1);
    if (quantity == null) {
      return res.status(400).send({ message: "Quantity must be a positive whole number." });
    }

    const existing = await TripWorkerRole.findOne({ where: { tripId, workerRoleId } });
    if (existing) {
      return res.status(400).send({ message: "This role is already on the trip's list." });
    }

    const emails = parseEmails(req.body.emails);
    if (emails.length) {
      const message = await reservationEmailError(tripId, emails);
      if (message) return res.status(400).send({ message });
      if (emails.length > quantity) {
        return res.status(400).send({ message: `Only ${quantity} open slots for this role.` });
      }
    }

    const data = await db.sequelize.transaction(async (transaction) => {
      const created = await TripWorkerRole.create({ tripId, workerRoleId, quantity }, { transaction });
      await TripWorkerRoleReservation.bulkCreate(
        emails.map((email) => ({ tripId, tripWorkerRoleId: created.id, email })),
        { transaction }
      );
      return created;
    });
    res.send(await loadOne(data.id));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "That email is already reserved on this trip." });
    }
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await TripWorkerRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    const { ok } = await canManage(req, row.tripId);
    if (!ok) return res.status(403).send({ message: "Forbidden." });

    const quantity = parseQuantity(req.body.quantity);
    if (quantity == null) {
      return res.status(400).send({ message: "Quantity must be a positive whole number." });
    }
    const reservationCount = await TripWorkerRoleReservation.count({ where: { tripWorkerRoleId: row.id } });
    if (quantity < reservationCount) {
      return res.status(400).send({ message: "Remove reserved emails first." });
    }

    await row.update({ quantity });
    res.send(await loadOne(row.id));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await TripWorkerRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    const { ok } = await canManage(req, row.tripId);
    if (!ok) return res.status(403).send({ message: "Forbidden." });

    // Clear participant assignments before removing the trip worker role.
    await TripPeopleRole.update(
      { tripWorkerRoleId: null },
      { where: { tripWorkerRoleId: row.id } }
    );
    await TripWorkerRoleReservation.destroy({ where: { tripWorkerRoleId: row.id } });
    await row.destroy();
    res.send({ message: "Deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/** Trip role the caller may manage, or an error response already sent. */
const loadManagedRole = async (req, res) => {
  const row = await TripWorkerRole.findByPk(req.params.id);
  if (!row) {
    res.status(404).send({ message: "Record not found." });
    return null;
  }
  const { ok } = await canManage(req, row.tripId);
  if (!ok) {
    res.status(403).send({ message: "Forbidden." });
    return null;
  }
  return row;
};

/** Reservations for a trip role ordered by email, with the filling application when filled. */
const loadReservationRows = async (row, ids = null) => {
  const [reservations, assignments] = await Promise.all([
    TripWorkerRoleReservation.findAll({
      where: { tripWorkerRoleId: row.id, ...(ids ? { id: ids } : {}) },
      order: [["email", "ASC"]],
    }),
    loadOccupyingAssignments(row.tripId),
  ]);
  return reservations.map((reservation) => {
    const match = assignments.find(
      (a) =>
        Number(a.tripWorkerRoleId) === Number(row.id) &&
        normalizeEmail(a.person?.email) === reservation.email
    );
    return {
      id: reservation.id,
      email: reservation.email,
      filled: !!match,
      applicantName: match
        ? [match.person?.firstName, match.person?.lastName].filter(Boolean).join(" ")
        : null,
      applicationStatus: match?.status || null,
    };
  });
};

/** First email in the request that cannot be reserved (Feature 56 FR-003), as an error message. */
const reservationEmailError = async (tripId, emails) => {
  if (!emails.length || emails.some((email) => !EMAIL_PATTERN.test(email))) {
    return "Enter valid email addresses.";
  }
  const repeated = emails.find((email, index) => emails.indexOf(email) !== index);
  if (repeated) return `${repeated} is already reserved on this trip.`;

  const existing = await TripWorkerRoleReservation.findOne({ where: { tripId, email: emails } });
  if (existing) return `${existing.email} is already reserved on this trip.`;

  const people = await db.person.findAll({
    where: where(fn("LOWER", col("email")), { [Op.in]: emails }),
    attributes: ["id", "email"],
  });
  if (people.length) {
    const applied = await TripPeopleRole.findOne({
      where: {
        tripId,
        peopleId: people.map((p) => p.id),
        status: { [Op.in]: ROLE_OCCUPYING_STATUSES },
      },
      attributes: ["peopleId"],
    });
    if (applied) {
      const person = people.find((p) => Number(p.id) === Number(applied.peopleId));
      return `${normalizeEmail(person.email)} has already applied for this trip.`;
    }
  }
  return null;
};

exports.findReservations = async (req, res) => {
  try {
    const row = await loadManagedRole(req, res);
    if (!row) return;
    res.send(await loadReservationRows(row));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.addReservations = async (req, res) => {
  try {
    const row = await loadManagedRole(req, res);
    if (!row) return;

    const emails = parseEmails(req.body?.emails);
    const message = await reservationEmailError(row.tripId, emails);
    if (message) return res.status(400).send({ message });

    const [role] = await withCapacityFields(row.tripId, [row]);
    if (role.availableCount < emails.length) {
      return res
        .status(400)
        .send({ message: `Only ${role.availableCount} open slots for this role.` });
    }

    const created = await db.sequelize.transaction((transaction) =>
      TripWorkerRoleReservation.bulkCreate(
        emails.map((email) => ({ tripId: row.tripId, tripWorkerRoleId: row.id, email })),
        { transaction }
      )
    );
    res.status(201).send(await loadReservationRows(row, created.map((r) => r.id)));
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).send({ message: "That email is already reserved on this trip." });
    }
    res.status(500).send({ message: err.message });
  }
};

exports.deleteReservation = async (req, res) => {
  try {
    const row = await loadManagedRole(req, res);
    if (!row) return;
    const reservation = await TripWorkerRoleReservation.findOne({
      where: { id: req.params.reservationId, tripWorkerRoleId: row.id },
    });
    if (!reservation) return res.status(404).send({ message: "Reservation not found." });
    await reservation.destroy();
    res.send({ message: "Deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
