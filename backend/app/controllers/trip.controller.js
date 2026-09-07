import db from "../models/index.js";
import path from "path";
import fs from "fs";
import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
  tripListFilter,
} from "../authorization/accessControl.js";
import { optimisticUpdate } from "../utils/optimisticUpdate.js";
import { getTripLeaderPeopleIds, getTripLeaderNamesByTripIds, getActiveParticipantCountsByTripIds, getActiveParticipantTotalCostsByTripIds, getDonationTotalsByTripIds, syncTripLeaders } from "../utils/tripLeaders.js";
import { withCapacityFields } from "../utils/tripRoleCapacity.js";
import {
  arePersonDocumentsUploaded,
  isRequiredPassportUploaded,
  isRequiredRoleDocumentUploaded,
  isUnder18,
  isProfileComplete,
  loadPersonDocumentsForCompleteness,
  loadPersonForCompleteness,
  loadWorkerRoleDocumentRequirements,
  missingRequiredRoleDocuments,
  tripDocumentCompareDate,
} from "../utils/tripParticipantApplicationStatus.js";
import {
  getApplicationMissingItemLabels,
  travelOptionsIncompleteMessage,
} from "../utils/applicationMissingItems.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "../utils/organizationAgreement.js";
import { normalizeApplicationPregnancy } from "../utils/pregnancyFields.js";

const Trip = db.trip;
const TripPeopleRole = db.tripPeopleRole;
const TripWorkerRole = db.tripWorkerRole;
const TripTravelOption = db.tripTravelOption;
const TripPeopleRoleOption = db.tripPeopleRoleOption;
const TripDonation = db.tripDonation;
const Op = db.Sequelize.Op;

const canManageTripStatus = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return { ok: false, status: 404, trip: null };
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) {
    return { ok: true, trip: access.trip };
  }
  if (await isTripLeaderForTrip(req, tripId)) {
    return { ok: true, trip: access.trip };
  }
  return { ok: false, status: 403, trip: access.trip };
};

const personDisplayName = (person) => {
  if (!person) return "—";
  const name = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim();
  return name || "—";
};

const resolveParticipantCost = (assignment, trip) => {
  if (assignment?.participantCost != null && assignment.participantCost !== "") {
    return Number(assignment.participantCost);
  }
  if (trip?.participantCost != null && trip.participantCost !== "") {
    return Number(trip.participantCost);
  }
  return null;
};
const tripFields = [
  "orgId",
  "status",
  "name",
  "location",
  "city",
  "country",
  "description",
  "startDate",
  "endDate",
  "facebookPage",
  "instagramId",
  "participantCost",
  "requirePassport",
];

const exports = {};

exports.findAll = async (req, res) => {
  try {
    const where = await tripListFilter(req);
    if (where === null) return res.send([]);
    const data = await Trip.findAll({
      where: where || {},
      include: [{ model: db.organization, as: "organization", attributes: ["id", "name", "logo", "colorFamily"] }],
      order: [["startDate", "DESC"]],
    });
    const leadersByTripId = await getTripLeaderNamesByTripIds(data.map((trip) => trip.id));
    const activeParticipantsByTripId = await getActiveParticipantCountsByTripIds(data.map((trip) => trip.id));
    const totalCostsByTripId = await getActiveParticipantTotalCostsByTripIds(data);
    const donationTotalsByTripId = await getDonationTotalsByTripIds(data.map((trip) => trip.id));
    res.send(
      data.map((trip) => ({
        ...trip.toJSON(),
        leaderNames: leadersByTripId.get(trip.id) || [],
        activeParticipantCount: activeParticipantsByTripId.get(trip.id) || 0,
        totalParticipantCost: totalCostsByTripId.get(trip.id) || 0,
        donationTotal: donationTotalsByTripId.get(trip.id) || 0,
      }))
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const access = await canAccessTrip(req, req.params.id);
    if (!access.ok) return res.status(404).send({ message: "Trip not found." });
    const data = await Trip.findByPk(req.params.id, {
      include: [{ model: db.organization, as: "organization" }],
    });
    const leaderPeopleIds = await getTripLeaderPeopleIds(data.id);
    const leadersByTripId = await getTripLeaderNamesByTripIds([data.id]);
    res.send({
      ...data.toJSON(),
      leaderPeopleIds,
      leaderNames: leadersByTripId.get(data.id) || [],
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/** Feature 28 — Trip Status board (staff: Trip Leader / Org Admin / System Admin). */
exports.findStatus = async (req, res) => {
  try {
    const tripId = req.params.id;
    const manage = await canManageTripStatus(req, tripId);
    if (!manage.ok) {
      return res
        .status(manage.status)
        .send({ message: manage.status === 404 ? "Trip not found." : "Forbidden." });
    }

    const trip = await Trip.findByPk(tripId, {
      include: [{ model: db.organization, as: "organization", attributes: ["id", "name"] }],
    });
    if (!trip) return res.status(404).send({ message: "Trip not found." });
    const tripJson = trip.toJSON();
    const orgId = tripJson.orgId;

    const rolesRaw = await TripWorkerRole.findAll({
      where: { tripId },
      include: [
        {
          model: db.workerRole,
          as: "workerRole",
          attributes: ["id", "name", "description", "licenseRequired", "status"],
        },
      ],
      order: [["id", "ASC"]],
    });
    const rolesNeeded = (await withCapacityFields(tripId, rolesRaw)).map((role) => ({
      id: role.id,
      workerRoleId: role.workerRoleId,
      workerRoleName: role.workerRole?.name || null,
      quantity: role.quantity,
      signedUpCount: role.signedUpCount,
      availableCount: role.availableCount,
    }));

    const travelOptionsRaw = await TripTravelOption.findAll({
      where: { tripId },
      order: [
        ["setNumber", "ASC"],
        ["id", "ASC"],
      ],
    });
    const travelOptions = travelOptionsRaw.map((option) => {
      const json = option.toJSON();
      return {
        id: json.id,
        description: json.description,
        setNumber: json.setNumber,
        priceAdjustment: json.priceAdjustment,
      };
    });

    const assignments = await TripPeopleRole.findAll({
      where: { tripId },
      include: [
        {
          model: db.person,
          as: "person",
          attributes: ["id", "firstName", "middleName", "lastName", "gender", "birthDate"],
        },
        {
          model: TripWorkerRole,
          as: "tripWorkerRole",
          include: [
            {
              model: db.workerRole,
              as: "workerRole",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["id", "ASC"]],
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

    const assignmentIds = assignments.map((row) => row.id);
    const optionRows =
      assignmentIds.length > 0
        ? await TripPeopleRoleOption.findAll({
            where: { tripPeopleRoleId: { [Op.in]: assignmentIds }, selected: true },
            attributes: ["tripPeopleRoleId", "tripTravelOptionId"],
          })
        : [];
    const selectedByAssignmentId = new Map();
    for (const row of optionRows) {
      const key = Number(row.tripPeopleRoleId);
      if (!selectedByAssignmentId.has(key)) selectedByAssignmentId.set(key, []);
      selectedByAssignmentId.get(key).push(Number(row.tripTravelOptionId));
    }

    const agreement = orgId != null ? await loadOrganizationAgreement(orgId) : null;
    const agreementRequired = !!agreement?.exists && !!agreement?.content?.trim();
    const medicalAgreement =
      orgId != null ? await loadOrganizationMedicalAgreement(orgId) : null;
    const medicalAgreementExists =
      !!medicalAgreement?.exists && !!medicalAgreement?.content?.trim();
    const documentCompareDate = tripDocumentCompareDate(tripJson);

    const participants = [];
    for (const assignment of assignments) {
      const json = assignment.toJSON();
      const peopleId = json.peopleId;
      const person = await loadPersonForCompleteness(peopleId);
      const personDocuments = await loadPersonDocumentsForCompleteness(peopleId);
      const { requiredDocumentTypeIds, requiredDocumentTypes } =
        await loadWorkerRoleDocumentRequirements(json.tripWorkerRoleId);

      const medicalAgreementRequired =
        medicalAgreementExists &&
        (person?.takesMedication === true || person?.takesMedication === 1);

      const pregnancy = normalizeApplicationPregnancy(json, {
        gender: person?.gender ?? null,
      });
      const selectedTravelOptionIds = selectedByAssignmentId.get(Number(json.id)) || [];
      const travelMsg = travelOptionsIncompleteMessage(travelOptions, selectedTravelOptionIds);

      const missingRoleDocs = missingRequiredRoleDocuments({
        documents: personDocuments,
        requiredDocumentTypes,
        compareDate: documentCompareDate,
      });
      const requiredRoleDocumentUploaded = isRequiredRoleDocumentUploaded({
        documents: personDocuments,
        documentTypeIds: requiredDocumentTypeIds,
        compareDate: documentCompareDate,
      });

      const missingItems = getApplicationMissingItemLabels({
        profileComplete: isProfileComplete(person, { orgId }),
        tripWorkerRoleId: json.tripWorkerRoleId,
        willSelfFund: !!json.willSelfFund,
        willRaiseFunds: !!json.willRaiseFunds,
        hasPreferredRoommate: !!json.hasPreferredRoommate,
        preferredRoommateNames: json.preferredRoommateNames || null,
        flightPurchaseOption: json.flightPurchaseOption || null,
        preferredDepartureAirportId: json.preferredDepartureAirportId ?? null,
        preferredReturnAirportId: json.preferredReturnAirportId ?? null,
        preferredCabinClass: json.preferredCabinClass || null,
        preferredAirlineId: json.preferredAirlineId ?? null,
        gender: person?.gender ?? null,
        isPregnant: pregnancy.ok ? pregnancy.isPregnant : null,
        pregnancyDueDate: pregnancy.ok ? pregnancy.pregnancyDueDate : null,
        agreementRequired,
        agreementAccepted: !!json.agreementAccepted,
        agreementSignatureName: json.agreementSignatureName || null,
        under18: isUnder18(person?.birthDate),
        agreementAdultFirstName: json.agreementAdultFirstName || null,
        agreementAdultLastName: json.agreementAdultLastName || null,
        agreementAdultEmail: json.agreementAdultEmail || null,
        agreementAdultRelationship: json.agreementAdultRelationship || null,
        medicalAgreementRequired,
        medicalAgreementAccepted: !!json.medicalAgreementAccepted,
        travelOptionsComplete: !travelMsg,
        travelOptionsMessage: travelMsg,
        personDocumentsUploaded: arePersonDocumentsUploaded(personDocuments),
        requiredRoleDocumentUploaded,
        missingRoleDocumentNames: missingRoleDocs.map((d) => d.description || d.name).filter(Boolean),
        requiredPassportUploaded: isRequiredPassportUploaded({
          documents: personDocuments,
          requirePassport: !!tripJson.requirePassport,
          compareDate: documentCompareDate,
        }),
        requirePassport: !!tripJson.requirePassport,
      });

      const participantCost = resolveParticipantCost(json, tripJson);
      const amountRaised = totalsByPersonId.get(Number(peopleId)) || 0;
      const amountOwed =
        participantCost == null || Number.isNaN(participantCost)
          ? null
          : Math.max(0, Number(participantCost) - amountRaised);

      participants.push({
        id: json.id,
        peopleId,
        displayName: personDisplayName(person || json.person),
        status: json.status,
        workerRoleName: json.tripWorkerRole?.workerRole?.name || null,
        participantCost: participantCost == null || Number.isNaN(participantCost) ? null : participantCost,
        amountRaised,
        amountOwed,
        missingItems,
        selectedTravelOptionIds,
      });
    }

    res.send({
      trip: {
        id: tripJson.id,
        name: tripJson.name,
        orgId: tripJson.orgId,
        organizationName: tripJson.organization?.name || null,
        status: tripJson.status,
        startDate: tripJson.startDate,
        endDate: tripJson.endDate,
        location: tripJson.location,
        city: tripJson.city,
        country: tripJson.country,
        participantCost: tripJson.participantCost,
      },
      rolesNeeded,
      travelOptions,
      participants,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const pickTripPayload = (body) => {
  const payload = {};
  for (const key of tripFields) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    if (key === "requirePassport") {
      payload.requirePassport =
        body.requirePassport === true ||
        body.requirePassport === 1 ||
        body.requirePassport === "1" ||
        body.requirePassport === "true";
      continue;
    }
    payload[key] = body[key];
  }
  return payload;
};

exports.create = async (req, res) => {
  try {
    const orgId = req.body.orgId;
    if (!isSystemAdmin(req) && !isOrgAdminForOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const { leaderPeopleIds } = req.body;
    const data = await Trip.create(pickTripPayload(req.body));
    if (Object.prototype.hasOwnProperty.call(req.body, "leaderPeopleIds")) {
      await syncTripLeaders(data.id, orgId, leaderPeopleIds);
    }
    const leaders = await getTripLeaderPeopleIds(data.id);
    res.send({ ...data.toJSON(), leaderPeopleIds: leaders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.copy = async (req, res) => {
  try {
    const source = await Trip.findByPk(req.params.id);
    if (!source) {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!isSystemAdmin(req) && !isOrgAdminForOrg(req, source.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      return res.status(400).send({ message: "Name is required." });
    }

    const leaderPeopleIds = await getTripLeaderPeopleIds(source.id);
    const sourceWorkerRoles = await db.tripWorkerRole.findAll({
      where: { tripId: source.id },
    });
    const sourceTravelOptions = await db.tripTravelOption.findAll({
      where: { tripId: source.id },
    });

    const transaction = await db.sequelize.transaction();
    let data;
    try {
      data = await Trip.create(
        {
          orgId: source.orgId,
          status: source.status,
          name,
          location: source.location,
          city: source.city,
          country: source.country,
          description: source.description,
          startDate: source.startDate,
          endDate: source.endDate,
          image: source.image,
          facebookPage: source.facebookPage,
          instagramId: source.instagramId,
          participantCost: source.participantCost,
          requirePassport: !!source.requirePassport,
          version: 0,
        },
        { transaction }
      );

      await syncTripLeaders(data.id, source.orgId, leaderPeopleIds, { transaction });

      for (const row of sourceWorkerRoles) {
        await db.tripWorkerRole.create(
          {
            tripId: data.id,
            workerRoleId: row.workerRoleId,
            quantity: row.quantity,
          },
          { transaction }
        );
      }

      for (const row of sourceTravelOptions) {
        await db.tripTravelOption.create(
          {
            tripId: data.id,
            description: row.description,
            priceAdjustment: row.priceAdjustment,
            setNumber: row.setNumber,
          },
          { transaction }
        );
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    const leaders = await getTripLeaderPeopleIds(data.id);
    res.status(201).send({ ...data.toJSON(), leaderPeopleIds: leaders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const access = await canAccessTrip(req, req.params.id);
    if (!access.ok) return res.status(404).send({ message: "Trip not found." });
    const canManageOrgTrip =
      isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req);
    if (!canManageOrgTrip && !isTripLeaderForTrip(req, req.params.id)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const body = { ...req.body };
    if (!canManageOrgTrip) {
      delete body.orgId;
    }
    const { leaderPeopleIds } = body;
    const result = await optimisticUpdate(Trip, req.params.id, body, tripFields);
    if (!result.ok) return res.status(result.status).send({ message: result.message });
    if (Object.prototype.hasOwnProperty.call(body, "leaderPeopleIds")) {
      const orgId = result.data.orgId;
      await syncTripLeaders(req.params.id, orgId, leaderPeopleIds);
    }
    const leaders = await getTripLeaderPeopleIds(req.params.id);
    res.send({ ...result.data.toJSON(), leaderPeopleIds: leaders });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.uploadImage = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id);
    if (!trip) return res.status(404).send({ message: "Trip not found." });

    const access = await canAccessTrip(req, req.params.id);
    if (!access.ok) return res.status(404).send({ message: "Trip not found." });
    const canManage =
      isSystemAdmin(req) ||
      isOrgAdminForOrg(req, trip.orgId) ||
      isTripLeaderForTrip(req, req.params.id);
    if (!canManage) return res.status(403).send({ message: "Forbidden." });
    if (!req.file) return res.status(400).send({ message: "No image uploaded." });

    if (trip.image) {
      for (const filePath of [path.join("images", trip.image), path.join("uploads", trip.image)]) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    const image = path.join("trips", req.file.filename).replace(/\\/g, "/");
    await Trip.update({ image }, { where: { id: req.params.id } });
    res.send({ message: "Image uploaded.", image });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const access = await canAccessTrip(req, req.params.id);
    if (!access.ok) return res.status(404).send({ message: "Trip not found." });
    if (!isOrgAdminForOrg(req, access.trip.orgId) && !isSystemAdmin(req)) {
      return res.status(403).send({ message: "Forbidden." });
    }
    const trip = await Trip.findByPk(req.params.id);
    if (trip?.image) {
      for (const filePath of [path.join("images", trip.image), path.join("uploads", trip.image)]) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    await Trip.destroy({ where: { id: req.params.id } });
    res.send({ message: "Trip deleted." });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
