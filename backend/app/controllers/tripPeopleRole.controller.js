import db from "../models/index.js";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { TRIP_PARTICIPANT_STATUSES } from "../models/tripPeopleRole.model.js";
import {
  arePersonDocumentsUploaded,
  isRequiredPassportUploaded,
  isRequiredRoleDocumentUploaded,
  loadPersonDocumentsForCompleteness,
  loadWorkerRoleDocumentRequirements,
  loadPersonForCompleteness,
  MANUAL_TRIP_PARTICIPANT_STATUSES,
  resolveAppliedOrIncompleteStatus,
  shouldAutoSetApplicationStatus,
  tripDocumentCompareDate,
} from "../utils/tripParticipantApplicationStatus.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "../utils/organizationAgreement.js";
import { normalizeApplicationPregnancy } from "../utils/pregnancyFields.js";
import {
  cancelApplicationAssignment,
  uncancelApplicationAssignment,
} from "../utils/applicationCancel.js";
import { flightPurchaseInclude } from "../utils/flightPurchaseFields.js";
import { sendApplicationEventEmails } from "../utils/eventEmails.js";
import { participantCostBreakdown } from "../utils/participantTotals.js";
import {
  ADDON_EXPENSE_DAYS_MESSAGES,
  DAYS_MESSAGE,
  daysLimitMessage,
  parseDays,
  participantFlightDates,
  participantTravelDates,
} from "../utils/tripDays.js";
import {
  loadSelectedTravelOptionIds,
  loadTripTravelOptions,
  parseSelectedTravelOptionIds,
  selectedOptionsTotal,
  shiftParticipantCost,
  syncTripPeopleRoleOptions,
  validateSelectedTravelOptionIds,
} from "../utils/tripOptionSelection.js";

const TripPeopleRole = db.tripPeopleRole;
const Trip = db.trip;
const TripDonation = db.tripDonation;
const TripWorkerRole = db.tripWorkerRole;
const TripTravelOption = db.tripTravelOption;
const TripPeopleRoleOption = db.tripPeopleRoleOption;
const Op = db.Sequelize.Op;
const fields = [
  "tripId",
  "peopleId",
  "roleId",
  "tripWorkerRoleId",
  "status",
  "participantCost",
  "whygoText",
  "willSelfFund",
  "willRaiseFunds",
  "licenseStatus",
  "hasPreferredRoommate",
  "preferredRoommateNames",
  "flightPurchaseOption",
  "preferredDepartureAirportId",
  "preferredReturnAirportId",
  "preferredCabinClass",
  "preferredAirlineId",
  "preferredRefundableTicket",
  "agreementAccepted",
  "agreementSignatureName",
  "agreementDate",
  "agreementAdultFirstName",
  "agreementAdultLastName",
  "agreementAdultEmail",
  "agreementAdultRelationship",
  "medicalAgreementAccepted",
  "medicalAgreementDate",
  "isPregnant",
  "pregnancyDueDate",
  "assiginmentDateTime",
];

const listIncludes = [
  { model: db.person, as: "person" },
  { model: db.role, as: "role" },
  {
    model: TripWorkerRole,
    as: "tripWorkerRole",
    include: [
      {
        model: db.workerRole,
        as: "workerRole",
        attributes: ["id", "name", "description", "documentTypeId", "status"],
        include: [
          { model: db.documentType, as: "documentType", attributes: ["id", "description", "type"] },
          {
            model: db.documentType,
            as: "requiredDocumentTypes",
            attributes: ["id", "description", "type"],
            through: { attributes: [] },
          },
        ],
      },
    ],
  },
  ...flightPurchaseInclude,
  {
    model: db.tripPeopleRoleExpense,
    as: "addonExpenses",
    attributes: ["id", "description", "cost", "daysBefore", "daysAfter"],
  },
];

const ADDON_EXPENSE_MESSAGE = "Each add-on expense needs a description and a cost of $0 or more.";

/** `{ list }` of validated `{ description, cost, daysBefore, daysAfter }` rows, or `{ message }`. */
const parseAddonExpenses = (value) => {
  if (!Array.isArray(value)) return { message: ADDON_EXPENSE_MESSAGE };
  const list = [];
  for (const item of value) {
    const description = typeof item?.description === "string" ? item.description.trim() : "";
    const cost = item?.cost == null || item.cost === "" ? NaN : Number(item.cost);
    if (!description || description.length > 255 || !Number.isFinite(cost) || cost < 0) {
      return { message: ADDON_EXPENSE_MESSAGE };
    }
    if (Math.abs(cost * 100 - Math.round(cost * 100)) > 1e-6) return { message: ADDON_EXPENSE_MESSAGE };
    const daysBefore = parseDays(item.daysBefore);
    const daysAfter = parseDays(item.daysAfter);
    if (daysBefore == null || daysAfter == null) return { message: DAYS_MESSAGE };
    list.push({ description, cost: Math.round(cost * 100) / 100, daysBefore, daysAfter });
  }
  const limitMessage = daysLimitMessage(list, ADDON_EXPENSE_DAYS_MESSAGES);
  if (limitMessage) return { message: limitMessage };
  return { list };
};

const withAddonExpenses = (row) => {
  const json = row.toJSON();
  json.addonExpenses = (json.addonExpenses || [])
    .sort((a, b) => a.id - b.id)
    .map(({ id, description, cost, daysBefore, daysAfter }) => ({
      id,
      description,
      cost: Number(cost),
      daysBefore,
      daysAfter,
    }));
  return json;
};

const exports = {};

const canManageTripPeople = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return false;
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) return true;
  return isTripLeaderForTrip(req, tripId);
};

const normalizeTripWorkerRoleId = (value) => {
  if (value == null || value === "") return null;
  return Number(value);
};

const validateTripWorkerRole = async (tripId, tripWorkerRoleId) => {
  if (tripWorkerRoleId == null) return { ok: true, tripWorkerRoleId: null };
  const row = await TripWorkerRole.findByPk(tripWorkerRoleId, { attributes: ["id", "tripId"] });
  if (!row) return { ok: false, status: 400, message: "Trip worker role not found." };
  if (Number(row.tripId) !== Number(tripId)) {
    return { ok: false, status: 400, message: "Worker role must belong to this trip." };
  }
  return { ok: true, tripWorkerRoleId: row.id };
};

const INVALID_STATUS_MESSAGE = `Status must be one of: ${TRIP_PARTICIPANT_STATUSES.join(", ")}.`;

const normalizeManualStatus = (value) => {
  if (value == null || value === "") return null;
  const status = String(value).toLowerCase();
  if (!TRIP_PARTICIPANT_STATUSES.includes(status)) return null;
  return status;
};

const computeStatusForPayload = async (payload, orgId) => {
  const person = await loadPersonForCompleteness(payload.peopleId);
  const personDocuments = await loadPersonDocumentsForCompleteness(payload.peopleId);
  const { requiredDocumentTypeIds, requiredSpecializations } =
    await loadWorkerRoleDocumentRequirements(payload.tripWorkerRoleId);
  const trip =
    payload.tripId != null
      ? await Trip.findByPk(payload.tripId, {
          attributes: ["id", "startDate", "endDate", "requirePassport"],
        })
      : null;
  const agreement = orgId != null ? await loadOrganizationAgreement(orgId) : null;
  const agreementRequired = !!agreement?.exists && !!agreement?.content?.trim();
  const medicalAgreement = orgId != null ? await loadOrganizationMedicalAgreement(orgId) : null;
  const medicalAgreementRequired =
    !!medicalAgreement?.exists &&
    !!medicalAgreement?.content?.trim() &&
    (person?.takesMedication === true || person?.takesMedication === 1);
  const pregnancy = normalizeApplicationPregnancy(payload, { gender: person?.gender ?? null });
  const documentCompareDate = tripDocumentCompareDate(trip);
  return resolveAppliedOrIncompleteStatus({
    person,
    tripWorkerRoleId: payload.tripWorkerRoleId,
    willSelfFund: !!payload.willSelfFund,
    willRaiseFunds: !!payload.willRaiseFunds,
    licenseStatus: payload.licenseStatus || null,
    hasPreferredRoommate: !!payload.hasPreferredRoommate,
    preferredRoommateNames: payload.preferredRoommateNames || null,
    flightPurchaseOption: payload.flightPurchaseOption || null,
    preferredDepartureAirportId: payload.preferredDepartureAirportId ?? null,
    preferredReturnAirportId: payload.preferredReturnAirportId ?? null,
    preferredCabinClass: payload.preferredCabinClass || null,
    preferredAirlineId: payload.preferredAirlineId ?? null,
    preferredRefundableTicket:
      payload.preferredRefundableTicket === true || payload.preferredRefundableTicket === false
        ? payload.preferredRefundableTicket
        : null,
    agreementRequired,
    agreementAccepted: !!payload.agreementAccepted,
    agreementSignatureName: payload.agreementSignatureName || null,
    agreementAdultFirstName: payload.agreementAdultFirstName || null,
    agreementAdultLastName: payload.agreementAdultLastName || null,
    agreementAdultEmail: payload.agreementAdultEmail || null,
    agreementAdultRelationship: payload.agreementAdultRelationship || null,
    medicalAgreementRequired,
    medicalAgreementAccepted: !!payload.medicalAgreementAccepted,
    isPregnant: pregnancy.ok ? pregnancy.isPregnant : null,
    pregnancyDueDate: pregnancy.ok ? pregnancy.pregnancyDueDate : null,
    personDocumentsUploaded: arePersonDocumentsUploaded(personDocuments),
    requiredRoleDocumentUploaded: isRequiredRoleDocumentUploaded({
      documents: personDocuments,
      documentTypeIds: requiredDocumentTypeIds,
      compareDate: documentCompareDate,
      requiredSpecializations,
    }),
    requiredPassportUploaded: isRequiredPassportUploaded({
      documents: personDocuments,
      requirePassport: !!trip?.requirePassport,
      compareDate: documentCompareDate,
    }),
    orgId,
  });
};

exports.findAll = async (req, res) => {
  try {
    const tripId = req.query.tripId;
    if (!tripId) return res.status(400).send({ message: "tripId query param required." });
    if (!(await canManageTripPeople(req, tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const data = await TripPeopleRole.findAll({
      where: { tripId },
      include: listIncludes,
    });

    const totals = await TripDonation.findAll({
      attributes: ["personId", [db.sequelize.fn("SUM", db.sequelize.col("amount")), "donationTotal"]],
      where: { tripId, personId: { [Op.ne]: null } },
      group: ["personId"],
      raw: true,
    });
    const totalsByPersonId = new Map(
      totals.map((row) => [Number(row.personId), Number(row.donationTotal) || 0])
    );
    const trip = await Trip.findByPk(tripId, {
      attributes: ["id", "participantCost", "startDate", "endDate"],
    });

    const rows = [];
    for (const row of data) {
      const costBreakdown = await participantCostBreakdown(trip, row);
      rows.push({
        ...withAddonExpenses(row),
        donationTotal: totalsByPersonId.get(Number(row.peopleId)) || 0,
        totalTripCost: costBreakdown.totalTripCost,
        costBreakdown,
        ...(await participantTravelDates(trip, row.id)),
        ...(await participantFlightDates(row.id)),
      });
    }
    res.send(rows);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const loadTravelOptionsForAssignment = async (tripId, tripPeopleRoleId) => {
  const options = await TripTravelOption.findAll({
    where: { tripId },
    order: [
      ["setNumber", "ASC"],
      ["id", "ASC"],
    ],
  });
  let selectedMap = new Map();
  if (tripPeopleRoleId) {
    const rows = await TripPeopleRoleOption.findAll({
      where: { tripPeopleRoleId },
    });
    selectedMap = new Map(rows.map((r) => [Number(r.tripTravelOptionId), !!r.selected]));
  }
  return options.map((option) => {
    const json = option.toJSON();
    return {
      ...json,
      selected: selectedMap.has(Number(json.id)) ? selectedMap.get(Number(json.id)) : false,
    };
  });
};

exports.findOne = async (req, res) => {
  try {
    const row = await TripPeopleRole.findByPk(req.params.id, { include: listIncludes });
    if (!row) return res.status(404).send({ message: "Record not found." });
    if (!(await canManageTripPeople(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const travelOptions = await loadTravelOptionsForAssignment(row.tripId, row.id);
    res.send({
      ...withAddonExpenses(row),
      travelOptions,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!(await canManageTripPeople(req, req.body.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const payload = { ...req.body };
    payload.tripWorkerRoleId = normalizeTripWorkerRoleId(payload.tripWorkerRoleId);
    const twrCheck = await validateTripWorkerRole(payload.tripId, payload.tripWorkerRoleId);
    if (!twrCheck.ok) return res.status(twrCheck.status).send({ message: twrCheck.message });
    payload.tripWorkerRoleId = twrCheck.tripWorkerRoleId;

    const requestedStatus = normalizeManualStatus(payload.status);
    if (payload.status != null && payload.status !== "" && !requestedStatus) {
      return res.status(400).send({ message: INVALID_STATUS_MESSAGE });
    }

    if (requestedStatus && MANUAL_TRIP_PARTICIPANT_STATUSES.includes(requestedStatus)) {
      payload.status = requestedStatus;
    } else {
      const tripForStatus = await Trip.findByPk(payload.tripId, {
        attributes: ["id", "orgId", "participantCost"],
      });
      payload.status = await computeStatusForPayload(payload, tripForStatus?.orgId);
      if (
        (payload.participantCost == null || payload.participantCost === "") &&
        tripForStatus?.participantCost != null
      ) {
        payload.participantCost = tripForStatus.participantCost;
      }
    }

    if (payload.participantCost == null || payload.participantCost === "") {
      const trip = await Trip.findByPk(payload.tripId, { attributes: ["participantCost"] });
      if (trip?.participantCost != null) {
        payload.participantCost = trip.participantCost;
      }
    }

    payload.agreementAccepted = !!payload.agreementAccepted;
    if (payload.agreementAccepted) {
      payload.agreementDate = payload.agreementDate || new Date();
    } else {
      payload.agreementAccepted = false;
      payload.agreementSignatureName = payload.agreementSignatureName || null;
      payload.agreementDate = null;
      payload.agreementAdultFirstName = null;
      payload.agreementAdultLastName = null;
      payload.agreementAdultEmail = null;
      payload.agreementAdultRelationship = null;
    }

    payload.medicalAgreementAccepted = !!payload.medicalAgreementAccepted;
    if (payload.medicalAgreementAccepted) {
      payload.medicalAgreementDate = payload.medicalAgreementDate || new Date();
    } else {
      payload.medicalAgreementAccepted = false;
      payload.medicalAgreementDate = null;
    }

    const data = await TripPeopleRole.create(payload);
    await sendApplicationEventEmails(data, null);
    const full = await TripPeopleRole.findByPk(data.id, { include: listIncludes });
    res.send(full);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const row = await TripPeopleRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    if (!(await canManageTripPeople(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const body = { ...req.body };
    const hasAddonExpenses = Object.prototype.hasOwnProperty.call(body, "addonExpenses");
    const parsedAddons = hasAddonExpenses ? parseAddonExpenses(body.addonExpenses) : null;
    if (parsedAddons?.message) return res.status(400).send({ message: parsedAddons.message });
    const addonExpenses = parsedAddons?.list ?? null;

    let travelOptions = null;
    let selectedTravelOptionIds = null;
    if (Object.prototype.hasOwnProperty.call(body, "selectedTravelOptionIds")) {
      travelOptions = await loadTripTravelOptions(row.tripId);
      selectedTravelOptionIds = parseSelectedTravelOptionIds(body);
      const selectionCheck = validateSelectedTravelOptionIds(travelOptions, selectedTravelOptionIds);
      if (!selectionCheck.ok) return res.status(400).send({ message: selectionCheck.message });
      if (!Object.prototype.hasOwnProperty.call(body, "participantCost")) {
        const previousIds = await loadSelectedTravelOptionIds(row.id);
        const difference =
          selectedOptionsTotal(travelOptions, selectedTravelOptionIds) -
          selectedOptionsTotal(travelOptions, previousIds);
        const trip = await Trip.findByPk(row.tripId, { attributes: ["participantCost"] });
        body.participantCost = shiftParticipantCost(row.participantCost, trip?.participantCost, difference);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "tripWorkerRoleId")) {
      body.tripWorkerRoleId = normalizeTripWorkerRoleId(body.tripWorkerRoleId);
      const twrCheck = await validateTripWorkerRole(row.tripId, body.tripWorkerRoleId);
      if (!twrCheck.ok) return res.status(twrCheck.status).send({ message: twrCheck.message });
      body.tripWorkerRoleId = twrCheck.tripWorkerRoleId;
    }

    const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
    const requestedStatus = hasStatus ? normalizeManualStatus(body.status) : null;
    if (hasStatus && body.status != null && body.status !== "" && !requestedStatus) {
      return res.status(400).send({ message: INVALID_STATUS_MESSAGE });
    }

    if (requestedStatus && MANUAL_TRIP_PARTICIPANT_STATUSES.includes(requestedStatus)) {
      body.status = requestedStatus;
    } else if (shouldAutoSetApplicationStatus(requestedStatus ?? row.status)) {
      const trip = await Trip.findByPk(row.tripId, { attributes: ["orgId"] });
      const merged = {
        peopleId: body.peopleId ?? row.peopleId,
        tripWorkerRoleId:
          Object.prototype.hasOwnProperty.call(body, "tripWorkerRoleId")
            ? body.tripWorkerRoleId
            : row.tripWorkerRoleId,
        willSelfFund: Object.prototype.hasOwnProperty.call(body, "willSelfFund")
          ? !!body.willSelfFund
          : !!row.willSelfFund,
        willRaiseFunds: Object.prototype.hasOwnProperty.call(body, "willRaiseFunds")
          ? !!body.willRaiseFunds
          : !!row.willRaiseFunds,
        licenseStatus: Object.prototype.hasOwnProperty.call(body, "licenseStatus")
          ? body.licenseStatus
          : row.licenseStatus,
        hasPreferredRoommate: Object.prototype.hasOwnProperty.call(body, "hasPreferredRoommate")
          ? !!body.hasPreferredRoommate
          : !!row.hasPreferredRoommate,
        preferredRoommateNames: Object.prototype.hasOwnProperty.call(body, "preferredRoommateNames")
          ? body.preferredRoommateNames
          : row.preferredRoommateNames,
        agreementAccepted: Object.prototype.hasOwnProperty.call(body, "agreementAccepted")
          ? !!body.agreementAccepted
          : !!row.agreementAccepted,
        agreementSignatureName: Object.prototype.hasOwnProperty.call(body, "agreementSignatureName")
          ? body.agreementSignatureName
          : row.agreementSignatureName,
        agreementAdultFirstName: Object.prototype.hasOwnProperty.call(body, "agreementAdultFirstName")
          ? body.agreementAdultFirstName
          : row.agreementAdultFirstName,
        agreementAdultLastName: Object.prototype.hasOwnProperty.call(body, "agreementAdultLastName")
          ? body.agreementAdultLastName
          : row.agreementAdultLastName,
        agreementAdultEmail: Object.prototype.hasOwnProperty.call(body, "agreementAdultEmail")
          ? body.agreementAdultEmail
          : row.agreementAdultEmail,
        agreementAdultRelationship: Object.prototype.hasOwnProperty.call(
          body,
          "agreementAdultRelationship"
        )
          ? body.agreementAdultRelationship
          : row.agreementAdultRelationship,
        medicalAgreementAccepted: Object.prototype.hasOwnProperty.call(
          body,
          "medicalAgreementAccepted"
        )
          ? !!body.medicalAgreementAccepted
          : !!row.medicalAgreementAccepted,
        isPregnant: Object.prototype.hasOwnProperty.call(body, "isPregnant")
          ? body.isPregnant
          : row.isPregnant,
        pregnancyDueDate: Object.prototype.hasOwnProperty.call(body, "pregnancyDueDate")
          ? body.pregnancyDueDate
          : row.pregnancyDueDate,
      };
      body.status = await computeStatusForPayload(merged, trip?.orgId);
    }

    if (Object.prototype.hasOwnProperty.call(body, "agreementAccepted")) {
      body.agreementAccepted = !!body.agreementAccepted;
      if (!body.agreementAccepted) {
        body.agreementDate = null;
        body.agreementAdultFirstName = null;
        body.agreementAdultLastName = null;
        body.agreementAdultEmail = null;
        body.agreementAdultRelationship = null;
        if (!Object.prototype.hasOwnProperty.call(body, "agreementSignatureName")) {
          body.agreementSignatureName = null;
        }
      } else if (
        !row.agreementAccepted ||
        (Object.prototype.hasOwnProperty.call(body, "agreementSignatureName") &&
          body.agreementSignatureName !== row.agreementSignatureName) ||
        (Object.prototype.hasOwnProperty.call(body, "agreementAdultFirstName") &&
          body.agreementAdultFirstName !== row.agreementAdultFirstName) ||
        (Object.prototype.hasOwnProperty.call(body, "agreementAdultLastName") &&
          body.agreementAdultLastName !== row.agreementAdultLastName) ||
        (Object.prototype.hasOwnProperty.call(body, "agreementAdultEmail") &&
          body.agreementAdultEmail !== row.agreementAdultEmail) ||
        (Object.prototype.hasOwnProperty.call(body, "agreementAdultRelationship") &&
          body.agreementAdultRelationship !== row.agreementAdultRelationship)
      ) {
        body.agreementDate = new Date();
      } else {
        body.agreementDate = row.agreementDate || new Date();
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "medicalAgreementAccepted")) {
      body.medicalAgreementAccepted = !!body.medicalAgreementAccepted;
      if (!body.medicalAgreementAccepted) {
        body.medicalAgreementDate = null;
      } else if (!row.medicalAgreementAccepted) {
        body.medicalAgreementDate = new Date();
      } else {
        body.medicalAgreementDate = row.medicalAgreementDate || new Date();
      }
    }

    const previousStatus = row.status;
    const result = await db.sequelize.transaction(async (transaction) => {
      const updated = await optimisticUpdate(TripPeopleRole, req.params.id, body, fields, { transaction });
      if (updated.ok && addonExpenses) {
        await db.tripPeopleRoleExpense.destroy({ where: { tripPeopleRoleId: row.id }, transaction });
        await db.tripPeopleRoleExpense.bulkCreate(
          addonExpenses.map((expense) => ({ ...expense, tripPeopleRoleId: row.id })),
          { transaction }
        );
      }
      if (updated.ok && selectedTravelOptionIds) {
        await syncTripPeopleRoleOptions(row.id, travelOptions, selectedTravelOptionIds, { transaction });
      }
      return updated;
    });
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    await sendApplicationEventEmails(result.data, previousStatus);
    const full = await TripPeopleRole.findByPk(req.params.id, { include: listIncludes });
    res.send(withAddonExpenses(full));
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await TripPeopleRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    if (!(await canManageTripPeople(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    await TripPeopleRole.destroy({ where: { id: req.params.id } });
    res.send({ message: "Deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const row = await TripPeopleRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    if (!(await canManageTripPeople(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const result = await cancelApplicationAssignment(row);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    const full = await TripPeopleRole.findByPk(req.params.id, { include: listIncludes });
    res.send(full);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.uncancel = async (req, res) => {
  try {
    const row = await TripPeopleRole.findByPk(req.params.id);
    if (!row) return res.status(404).send({ message: "Record not found." });
    if (!(await canManageTripPeople(req, row.tripId))) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const trip = await Trip.findByPk(row.tripId, { attributes: ["id", "orgId"] });
    const result = await uncancelApplicationAssignment(row, { orgId: trip?.orgId });
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    const full = await TripPeopleRole.findByPk(req.params.id, { include: listIncludes });
    res.send(full);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
