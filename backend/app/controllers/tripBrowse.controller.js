import db from "../models/index.js";
import {
  ROLE_TRIP_PARTICIPANT,
  ROLE_ORG_ADMIN,
  isSystemAdmin,
} from "../authorization/accessControl.js";
import {
  arePersonDocumentsUploaded,
  isRequiredPassportUploaded,
  isRequiredRoleDocumentUploaded,
  loadPersonDocumentsForCompleteness,
  loadPersonForCompleteness,
  resolveAppliedOrIncompleteStatus,
  isUnder18,
  tripDocumentCompareDate,
} from "../utils/tripParticipantApplicationStatus.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "../utils/organizationAgreement.js";
import { getTripLeadersForDisplay } from "../utils/tripLeaders.js";
import { normalizeApplicationPregnancy } from "../utils/pregnancyFields.js";
import { withCapacityFields } from "../utils/tripRoleCapacity.js";
import {
  cancelApplicationAssignment,
  uncancelApplicationAssignment,
} from "../utils/applicationCancel.js";

const Trip = db.trip;
const TripWorkerRole = db.tripWorkerRole;
const TripPeopleRole = db.tripPeopleRole;
const TripTravelOption = db.tripTravelOption;
const TripPeopleRoleOption = db.tripPeopleRoleOption;
const TripDonation = db.tripDonation;
const WorkerRole = db.workerRole;
const Role = db.role;
const Op = db.Sequelize.Op;

const LICENSE_STATUSES = ["yes", "yes_retired", "no"];

const parseBool = (value) => value === true || value === 1 || value === "1" || value === "true";

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const loadTripTravelOptions = async (tripId) =>
  TripTravelOption.findAll({
    where: { tripId },
    order: [
      ["setNumber", "ASC"],
      ["id", "ASC"],
    ],
  });

const parseSelectedTravelOptionIds = (body) => {
  const raw = body?.selectedTravelOptionIds;
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
};

const computeParticipantCostWithOptions = (baseCost, travelOptions, selectedIds) => {
  const base = Number(baseCost);
  const safeBase = Number.isFinite(base) ? base : 0;
  const selected = new Set((selectedIds || []).map(Number));
  const adjustment = (travelOptions || []).reduce((sum, option) => {
    if (!selected.has(Number(option.id))) return sum;
    const amount = Number(option.priceAdjustment);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return roundMoney(safeBase + adjustment);
};

const validateSelectedTravelOptionIds = (travelOptions, selectedIds) => {
  const byId = new Map((travelOptions || []).map((o) => [Number(o.id), o]));
  const invalid = (selectedIds || []).filter((id) => !byId.has(Number(id)));
  if (invalid.length) {
    return { ok: false, message: "One or more selected travel options are invalid for this trip." };
  }

  const groups = new Map();
  for (const option of travelOptions || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }

  const selected = new Set((selectedIds || []).map(Number));
  // An unanswered option group keeps the application incomplete rather than blocking the save.
  let missingSelection = false;
  for (const [, setOptions] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const selectedInSet = setOptions.filter((o) => selected.has(Number(o.id)));
    if (selectedInSet.length > 1) {
      return {
        ok: false,
        message: "Only one travel option can be selected per trip option group.",
      };
    }
    if (setOptions.length > 1 && selectedInSet.length !== 1) {
      missingSelection = true;
    }
  }

  return { ok: true, missingSelection };
};

const syncTripPeopleRoleOptions = async (tripPeopleRoleId, travelOptions, selectedIds) => {
  const selected = new Set((selectedIds || []).map(Number));
  const existing = await TripPeopleRoleOption.findAll({ where: { tripPeopleRoleId } });
  const existingByOptionId = new Map(
    existing.map((row) => [Number(row.tripTravelOptionId), row])
  );
  const keepOptionIds = new Set((travelOptions || []).map((o) => Number(o.id)));

  for (const option of travelOptions || []) {
    const optionId = Number(option.id);
    const isSelected = selected.has(optionId);
    const row = existingByOptionId.get(optionId);
    if (row) {
      if (!!row.selected !== isSelected) {
        await row.update({ selected: isSelected });
      }
    } else {
      await TripPeopleRoleOption.create({
        tripPeopleRoleId,
        tripTravelOptionId: optionId,
        selected: isSelected,
      });
    }
  }

  for (const row of existing) {
    if (!keepOptionIds.has(Number(row.tripTravelOptionId))) {
      await row.destroy();
    }
  }
};

const loadTravelOptionsForApplication = async (tripId, tripPeopleRoleId = null) => {
  const options = await loadTripTravelOptions(tripId);
  let selectedMap = new Map();
  if (tripPeopleRoleId) {
    const rows = await TripPeopleRoleOption.findAll({
      where: { tripPeopleRoleId },
    });
    selectedMap = new Map(rows.map((r) => [Number(r.tripTravelOptionId), !!r.selected]));
  }
  return options.map((option) => {
    const json = typeof option.toJSON === "function" ? option.toJSON() : option;
    return {
      ...json,
      selected: selectedMap.has(Number(json.id)) ? selectedMap.get(Number(json.id)) : false,
    };
  });
};

const trimOrNull = (value) => {
  const text = String(value || "").trim();
  return text || null;
};

const parseAgreementSignature = (body, { agreementRequired, participantUnder18 }) => {
  const agreementAccepted = parseBool(body?.agreementAccepted);
  const agreementSignatureName = agreementAccepted
    ? trimOrNull(body?.agreementSignatureName)
    : trimOrNull(body?.agreementSignatureName);
  const agreementAdultFirstName = trimOrNull(body?.agreementAdultFirstName);
  const agreementAdultLastName = trimOrNull(body?.agreementAdultLastName);
  const agreementAdultEmail = trimOrNull(body?.agreementAdultEmail);
  const agreementAdultRelationship = trimOrNull(body?.agreementAdultRelationship);

  // Incomplete applications may be saved without agreeing. Validate only when they do agree.
  if (agreementRequired && agreementAccepted) {
    if (!agreementSignatureName) {
      return {
        ok: false,
        message: participantUnder18
          ? "Enter the adult's name as the electronic signature."
          : "Enter your name as your electronic signature.",
      };
    }
    if (participantUnder18) {
      if (!agreementAdultFirstName) {
        return { ok: false, message: "Enter the adult signer's first name." };
      }
      if (!agreementAdultLastName) {
        return { ok: false, message: "Enter the adult signer's last name." };
      }
      if (!agreementAdultEmail) {
        return { ok: false, message: "Enter the adult signer's email." };
      }
      if (!agreementAdultRelationship) {
        return { ok: false, message: "Enter the adult's relationship to the participant." };
      }
    }
  }

  if (!agreementRequired || !agreementAccepted) {
    return {
      ok: true,
      agreementAccepted: false,
      agreementSignatureName: agreementRequired ? agreementSignatureName : null,
      agreementDate: null,
      agreementAdultFirstName: agreementRequired && participantUnder18 ? agreementAdultFirstName : null,
      agreementAdultLastName: agreementRequired && participantUnder18 ? agreementAdultLastName : null,
      agreementAdultEmail: agreementRequired && participantUnder18 ? agreementAdultEmail : null,
      agreementAdultRelationship:
        agreementRequired && participantUnder18 ? agreementAdultRelationship : null,
    };
  }

  return {
    ok: true,
    agreementAccepted: true,
    agreementSignatureName,
    agreementDate: new Date(),
    agreementAdultFirstName: participantUnder18 ? agreementAdultFirstName : null,
    agreementAdultLastName: participantUnder18 ? agreementAdultLastName : null,
    agreementAdultEmail: participantUnder18 ? agreementAdultEmail : null,
    agreementAdultRelationship: participantUnder18 ? agreementAdultRelationship : null,
  };
};

const parseMedicalAgreementAcceptance = (body, { medicalAgreementRequired }) => {
  const medicalAgreementAccepted = parseBool(body?.medicalAgreementAccepted);
  if (!medicalAgreementRequired || !medicalAgreementAccepted) {
    return {
      ok: true,
      medicalAgreementAccepted: false,
      medicalAgreementDate: null,
    };
  }
  return {
    ok: true,
    medicalAgreementAccepted: true,
    medicalAgreementDate: new Date(),
  };
};

const parsePregnancyFields = (body, person) =>
  normalizeApplicationPregnancy(body || {}, { gender: person?.gender ?? null });

const medicalAgreementRequiredForPerson = (medicalAgreement, person) =>
  !!medicalAgreement?.exists &&
  !!medicalAgreement?.content?.trim() &&
  (person?.takesMedication === true || person?.takesMedication === 1);
const orgInclude = {
  model: db.organization,
  as: "organization",
  attributes: ["id", "name", "logo", "colorFamily", "websiteUrl"],
};

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

const canBrowseOrg = (req, orgId) => {
  if (!req.user) return false;
  if (orgId == null || orgId === "") return false;
  if (isSystemAdmin(req)) return true;

  const id = Number(orgId);
  if (Number.isNaN(id)) return false;

  const adminOrgIds = (req.user.orgRoles || [])
    .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
    .map((r) => Number(r.orgId));
  if (adminOrgIds.includes(id)) return true;

  const memberOrgIds = [
    ...(req.user.orgRoles || []).map((r) => Number(r.orgId)),
    ...(req.user.tripRoles || []).map((r) => Number(r.trip?.orgId ?? r.orgId)),
  ];
  return memberOrgIds.includes(id);
};

// Visitors who sign in from a public organization or trip page have no role in that
// organization until they apply, and active trips are already publicly listed.
const canViewTrip = (req, trip) =>
  !!req.user && !!trip && (trip.status === "active" || canBrowseOrg(req, trip.orgId));

const loadTripRolesNeeded = async (tripId) => {
  const rows = await TripWorkerRole.findAll({
    where: { tripId },
    include: [workerRoleInclude],
    order: [[{ model: WorkerRole, as: "workerRole" }, "name", "ASC"]],
  });
  return withCapacityFields(tripId, rows);
};

const getPersonAssignment = async (tripId, peopleId) => {
  if (!peopleId) return null;
  return TripPeopleRole.findOne({
    where: { tripId, peopleId },
    include: [
      { model: Role, as: "role", attributes: ["id", "roleName"] },
      {
        model: TripWorkerRole,
        as: "tripWorkerRole",
        include: [workerRoleInclude],
      },
    ],
  });
};

const exports = {};

exports.listBrowseOrgs = async (req, res) => {
  try {
    if (isSystemAdmin(req)) {
      const orgs = await db.organization.findAll({
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
      return res.send(orgs);
    }

    // Org Admins: only organizations they administer.
    const adminOrgIds = [
      ...new Set(
        (req.user?.orgRoles || [])
          .filter((r) => r.role?.roleName === ROLE_ORG_ADMIN)
          .map((r) => Number(r.orgId))
          .filter((id) => !Number.isNaN(id))
      ),
    ];
    if (adminOrgIds.length) {
      const orgs = await db.organization.findAll({
        where: { id: adminOrgIds },
        attributes: ["id", "name"],
        order: [["name", "ASC"]],
      });
      return res.send(orgs);
    }

    // Participants / pending users: only organizations they belong to
    // (org membership or trip assignment).
    const membershipOrgIds = [
      ...new Set([
        ...(req.user?.orgRoles || [])
          .map((r) => Number(r.orgId))
          .filter((id) => !Number.isNaN(id)),
        ...(req.user?.tripRoles || [])
          .map((r) => Number(r.trip?.orgId ?? r.orgId))
          .filter((id) => !Number.isNaN(id)),
      ]),
    ];
    if (!membershipOrgIds.length) {
      return res.send([]);
    }
    const orgs = await db.organization.findAll({
      where: { id: membershipOrgIds },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });
    res.send(orgs);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.listMyTrips = async (req, res) => {
  try {
    const orgId = req.query.orgId;
    if (!orgId) return res.status(400).send({ message: "orgId is required." });
    if (!canBrowseOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.send([]);
    }

    const links = await TripPeopleRole.findAll({
      where: {
        peopleId,
        status: { [Op.in]: ["incomplete", "applied", "approved", "cancelled"] },
      },
      attributes: ["id", "tripId", "status"],
      include: [
        {
          model: Trip,
          as: "trip",
          where: { orgId },
          required: true,
          include: [orgInclude],
        },
      ],
      order: [
        [{ model: Trip, as: "trip" }, "startDate", "ASC"],
        [{ model: Trip, as: "trip" }, "name", "ASC"],
      ],
    });

    res.send(
      links.map((link) => {
        const trip = link.trip;
        return {
          ...trip.toJSON(),
          alreadyApplied: true,
          applicationStatus: link.status || null,
        };
      })
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.listActiveTrips = async (req, res) => {
  try {
    const orgId = req.query.orgId;
    if (!orgId) return res.status(400).send({ message: "orgId is required." });
    if (!canBrowseOrg(req, orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const trips = await Trip.findAll({
      where: { orgId, status: "active" },
      include: [orgInclude],
      order: [
        ["startDate", "ASC"],
        ["name", "ASC"],
      ],
    });

    const peopleId = req.user?.personId;
    const tripIds = trips.map((t) => t.id);
    let assignmentByTripId = new Map();
    if (peopleId && tripIds.length) {
      const links = await TripPeopleRole.findAll({
        where: { tripId: tripIds, peopleId },
        attributes: ["id", "tripId", "status"],
      });
      assignmentByTripId = new Map(links.map((l) => [Number(l.tripId), l]));
    }

    res.send(
      trips.map((trip) => {
        const assignment = assignmentByTripId.get(Number(trip.id));
        return {
          ...trip.toJSON(),
          alreadyApplied: !!assignment,
          applicationStatus: assignment?.status || null,
        };
      })
    );
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.getBrowseTrip = async (req, res) => {
  try {
    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip) {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canViewTrip(req, trip)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const assignment = await getPersonAssignment(trip.id, req.user?.personId);
    if (trip.status !== "active" && !assignment) {
      return res.status(404).send({ message: "Trip not found." });
    }

    const rolesNeeded = await loadTripRolesNeeded(trip.id);
    const participantAgreement = await loadOrganizationAgreement(trip.orgId);
    const medicalAgreement = await loadOrganizationMedicalAgreement(trip.orgId);
    const travelOptions = await loadTravelOptionsForApplication(trip.id, assignment?.id);
    const tripLeaders = await getTripLeadersForDisplay(trip.id);

    let myTripInfo = null;
    if (assignment) {
      const donationTotal =
        (await TripDonation.sum("amount", {
          where: { tripId: trip.id, personId: assignment.peopleId },
        })) || 0;
      myTripInfo = {
        status: assignment.status || null,
        workerRoleName: assignment.tripWorkerRole?.workerRole?.name || null,
        participantCost:
          assignment.participantCost != null
            ? Number(assignment.participantCost)
            : trip.participantCost != null
              ? Number(trip.participantCost)
              : null,
        donationTotal: Number(donationTotal) || 0,
      };
    }

    res.send({
      trip,
      rolesNeeded,
      alreadyApplied: !!assignment,
      applicationStatus: assignment?.status || null,
      myTripInfo,
      tripLeaders,
      participantAgreement,
      medicalAgreement,
      travelOptions,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.applyToTrip = async (req, res) => {
  try {
    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.status(400).send({ message: "Your account is not linked to a person profile." });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canViewTrip(req, trip)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const existing = await TripPeopleRole.findOne({ where: { tripId: trip.id, peopleId } });
    if (existing) {
      return res.status(409).send({
        message:
          existing.status === "approved"
            ? "You are already on this trip."
            : existing.status === "incomplete" || existing.status === "applied"
              ? "You have already applied to this trip."
              : `Your previous application for this trip is ${existing.status}.`,
        alreadyApplied: true,
        applicationStatus: existing.status,
      });
    }

    const tripWorkerRoleId =
      req.body?.tripWorkerRoleId != null && req.body.tripWorkerRoleId !== ""
        ? Number(req.body.tripWorkerRoleId)
        : null;
    if (!tripWorkerRoleId) {
      return res.status(400).send({ message: "A trip role with available positions is required." });
    }

    const rolesNeeded = await loadTripRolesNeeded(trip.id);
    const selectedRole = rolesNeeded.find((r) => Number(r.id) === tripWorkerRoleId);
    if (!selectedRole) {
      return res.status(400).send({ message: "Worker role must belong to this trip." });
    }
    if ((selectedRole.availableCount || 0) < 1) {
      return res.status(400).send({ message: "That trip role has no available positions." });
    }

    const willSelfFund = parseBool(req.body?.willSelfFund);
    const willRaiseFunds = parseBool(req.body?.willRaiseFunds);

    const licenseRequired = !!selectedRole.workerRole?.licenseRequired;
    let licenseStatus = req.body?.licenseStatus || null;
    if (licenseStatus && !LICENSE_STATUSES.includes(licenseStatus)) {
      return res.status(400).send({ message: "License status must be Yes, Yes retired, or No." });
    }
    if (!licenseRequired) licenseStatus = null;

    const hasPreferredRoommate = parseBool(req.body?.hasPreferredRoommate);
    const preferredRoommateNames = hasPreferredRoommate
      ? String(req.body?.preferredRoommateNames || "").trim() || null
      : null;

    const participantAgreement = await loadOrganizationAgreement(trip.orgId);
    const medicalAgreement = await loadOrganizationMedicalAgreement(trip.orgId);
    const agreementRequired = !!participantAgreement.exists && !!participantAgreement.content?.trim();
    const person = await loadPersonForCompleteness(peopleId);
    const personDocuments = await loadPersonDocumentsForCompleteness(peopleId);
    const medicalAgreementRequired = medicalAgreementRequiredForPerson(medicalAgreement, person);
    const participantUnder18 = isUnder18(person?.birthDate);
    const agreement = parseAgreementSignature(req.body, { agreementRequired, participantUnder18 });
    if (!agreement.ok) return res.status(400).send({ message: agreement.message });
    const medical = parseMedicalAgreementAcceptance(req.body, { medicalAgreementRequired });
    const pregnancy = parsePregnancyFields(req.body, person);
    if (!pregnancy.ok) return res.status(400).send({ message: pregnancy.message });

    const travelOptions = await loadTripTravelOptions(trip.id);
    const selectedTravelOptionIds = parseSelectedTravelOptionIds(req.body);
    const selectionCheck = validateSelectedTravelOptionIds(travelOptions, selectedTravelOptionIds);
    if (!selectionCheck.ok) return res.status(400).send({ message: selectionCheck.message });
    const participantCost = computeParticipantCostWithOptions(
      trip.participantCost,
      travelOptions,
      selectedTravelOptionIds
    );

    let participantRole = await Role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
    if (!participantRole) {
      participantRole = await Role.create({
        roleName: ROLE_TRIP_PARTICIPANT,
        roleDescription: "Participant on a trip",
      });
    }

    const documentCompareDate = tripDocumentCompareDate(trip);
    const status = resolveAppliedOrIncompleteStatus({
      person,
      tripWorkerRoleId,
      willSelfFund,
      willRaiseFunds,
      licenseStatus,
      hasPreferredRoommate,
      preferredRoommateNames,
      licenseRequired,
      agreementRequired,
      agreementAccepted: agreement.agreementAccepted,
      agreementSignatureName: agreement.agreementSignatureName,
      agreementAdultFirstName: agreement.agreementAdultFirstName,
      agreementAdultLastName: agreement.agreementAdultLastName,
      agreementAdultEmail: agreement.agreementAdultEmail,
      agreementAdultRelationship: agreement.agreementAdultRelationship,
      medicalAgreementRequired,
      medicalAgreementAccepted: medical.medicalAgreementAccepted,
      isPregnant: pregnancy.isPregnant,
      pregnancyDueDate: pregnancy.pregnancyDueDate,
      travelOptionsComplete: !selectionCheck.missingSelection,
      personDocumentsUploaded: arePersonDocumentsUploaded(personDocuments),
      requiredRoleDocumentUploaded: isRequiredRoleDocumentUploaded({
        documents: personDocuments,
        documentTypeIds:
          selectedRole.workerRole?.requiredDocumentTypes?.map((d) => d.id) ||
          (selectedRole.workerRole?.documentTypeId != null
            ? [selectedRole.workerRole.documentTypeId]
            : []),
        compareDate: documentCompareDate,
      }),
      requiredPassportUploaded: isRequiredPassportUploaded({
        documents: personDocuments,
        requirePassport: !!trip.requirePassport,
        compareDate: documentCompareDate,
      }),
      orgId: trip.orgId,
    });

    const link = await TripPeopleRole.create({
      tripId: trip.id,
      peopleId,
      roleId: participantRole.id,
      tripWorkerRoleId,
      status,
      participantCost,
      willSelfFund,
      willRaiseFunds,
      licenseStatus,
      hasPreferredRoommate,
      preferredRoommateNames,
      agreementAccepted: agreement.agreementAccepted,
      agreementSignatureName: agreement.agreementSignatureName,
      agreementDate: agreement.agreementDate,
      agreementAdultFirstName: agreement.agreementAdultFirstName,
      agreementAdultLastName: agreement.agreementAdultLastName,
      agreementAdultEmail: agreement.agreementAdultEmail,
      agreementAdultRelationship: agreement.agreementAdultRelationship,
      medicalAgreementAccepted: medical.medicalAgreementAccepted,
      medicalAgreementDate: medical.medicalAgreementDate,
      isPregnant: pregnancy.isPregnant,
      pregnancyDueDate: pregnancy.pregnancyDueDate,
      assiginmentDateTime: new Date(),
    });

    await syncTripPeopleRoleOptions(link.id, travelOptions, selectedTravelOptionIds);

    const participantOrgRole = await Role.findOne({ where: { roleName: ROLE_TRIP_PARTICIPANT } });
    if (participantOrgRole) {
      const orgLink = await db.orgPeopleRole.findOne({
        where: { orgId: trip.orgId, peopleId },
      });
      if (!orgLink) {
        await db.orgPeopleRole.create({
          orgId: trip.orgId,
          peopleId,
          roleId: participantOrgRole.id,
        });
      }
    }

    res.send({
      message: "Application submitted. Your organization will review it.",
      assignment: link,
      alreadyApplied: true,
      applicationStatus: status,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const EDITABLE_APPLICATION_STATUSES = ["incomplete", "applied"];

const loadApplicationAssignment = async (tripId, peopleId) => {
  if (!peopleId) return null;
  return TripPeopleRole.findOne({
    where: { tripId, peopleId },
    include: [
      {
        model: TripWorkerRole,
        as: "tripWorkerRole",
        include: [workerRoleInclude],
      },
      { model: Role, as: "role", attributes: ["id", "roleName"] },
    ],
  });
};

exports.getApplication = async (req, res) => {
  try {
    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.status(400).send({ message: "Your account is not linked to a person profile." });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canBrowseOrg(req, trip.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const assignment = await loadApplicationAssignment(trip.id, peopleId);
    if (!assignment) {
      return res.status(404).send({ message: "Application not found." });
    }

    const rolesNeeded = await loadTripRolesNeeded(trip.id);
    const participantAgreement = await loadOrganizationAgreement(trip.orgId);
    const medicalAgreement = await loadOrganizationMedicalAgreement(trip.orgId);
    const travelOptions = await loadTravelOptionsForApplication(trip.id, assignment.id);
    res.send({
      trip,
      rolesNeeded,
      application: assignment,
      applicationStatus: assignment.status,
      canEdit: EDITABLE_APPLICATION_STATUSES.includes(assignment.status),
      participantAgreement,
      medicalAgreement,
      travelOptions,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.updateApplication = async (req, res) => {
  try {
    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.status(400).send({ message: "Your account is not linked to a person profile." });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canBrowseOrg(req, trip.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const assignment = await TripPeopleRole.findOne({ where: { tripId: trip.id, peopleId } });
    if (!assignment) {
      return res.status(404).send({ message: "Application not found." });
    }
    if (!EDITABLE_APPLICATION_STATUSES.includes(assignment.status)) {
      return res.status(400).send({
        message: `This application cannot be updated while its status is ${assignment.status}.`,
      });
    }

    const tripWorkerRoleId =
      req.body?.tripWorkerRoleId != null && req.body.tripWorkerRoleId !== ""
        ? Number(req.body.tripWorkerRoleId)
        : null;
    if (!tripWorkerRoleId) {
      return res.status(400).send({ message: "A trip role with available positions is required." });
    }

    const rolesNeeded = await loadTripRolesNeeded(trip.id);
    const selectedRole = rolesNeeded.find((r) => Number(r.id) === tripWorkerRoleId);
    if (!selectedRole) {
      return res.status(400).send({ message: "Worker role must belong to this trip." });
    }
    const keepingSameRole = Number(assignment.tripWorkerRoleId) === tripWorkerRoleId;
    if (!keepingSameRole && (selectedRole.availableCount || 0) < 1) {
      return res.status(400).send({ message: "That trip role has no available positions." });
    }

    const willSelfFund = parseBool(req.body?.willSelfFund);
    const willRaiseFunds = parseBool(req.body?.willRaiseFunds);

    const licenseRequired = !!selectedRole.workerRole?.licenseRequired;
    let licenseStatus = req.body?.licenseStatus || null;
    if (licenseStatus && !LICENSE_STATUSES.includes(licenseStatus)) {
      return res.status(400).send({ message: "License status must be Yes, Yes retired, or No." });
    }
    if (!licenseRequired) licenseStatus = null;

    const hasPreferredRoommate = parseBool(req.body?.hasPreferredRoommate);
    const preferredRoommateNames = hasPreferredRoommate
      ? String(req.body?.preferredRoommateNames || "").trim() || null
      : null;

    const participantAgreement = await loadOrganizationAgreement(trip.orgId);
    const medicalAgreement = await loadOrganizationMedicalAgreement(trip.orgId);
    const agreementRequired = !!participantAgreement.exists && !!participantAgreement.content?.trim();
    const person = await loadPersonForCompleteness(peopleId);
    const personDocuments = await loadPersonDocumentsForCompleteness(peopleId);
    const medicalAgreementRequired = medicalAgreementRequiredForPerson(medicalAgreement, person);
    const participantUnder18 = isUnder18(person?.birthDate);
    const agreement = parseAgreementSignature(req.body, { agreementRequired, participantUnder18 });
    if (!agreement.ok) return res.status(400).send({ message: agreement.message });
    const medical = parseMedicalAgreementAcceptance(req.body, { medicalAgreementRequired });
    const pregnancy = parsePregnancyFields(req.body, person);
    if (!pregnancy.ok) return res.status(400).send({ message: pregnancy.message });

    const travelOptions = await loadTripTravelOptions(trip.id);
    const selectedTravelOptionIds = parseSelectedTravelOptionIds(req.body);
    const selectionCheck = validateSelectedTravelOptionIds(travelOptions, selectedTravelOptionIds);
    if (!selectionCheck.ok) return res.status(400).send({ message: selectionCheck.message });
    const participantCost = computeParticipantCostWithOptions(
      trip.participantCost,
      travelOptions,
      selectedTravelOptionIds
    );

    const documentCompareDate = tripDocumentCompareDate(trip);
    const status = resolveAppliedOrIncompleteStatus({
      person,
      tripWorkerRoleId,
      willSelfFund,
      willRaiseFunds,
      licenseStatus,
      hasPreferredRoommate,
      preferredRoommateNames,
      licenseRequired,
      agreementRequired,
      agreementAccepted: agreement.agreementAccepted,
      agreementSignatureName: agreement.agreementSignatureName,
      agreementAdultFirstName: agreement.agreementAdultFirstName,
      agreementAdultLastName: agreement.agreementAdultLastName,
      agreementAdultEmail: agreement.agreementAdultEmail,
      agreementAdultRelationship: agreement.agreementAdultRelationship,
      medicalAgreementRequired,
      medicalAgreementAccepted: medical.medicalAgreementAccepted,
      isPregnant: pregnancy.isPregnant,
      pregnancyDueDate: pregnancy.pregnancyDueDate,
      travelOptionsComplete: !selectionCheck.missingSelection,
      personDocumentsUploaded: arePersonDocumentsUploaded(personDocuments),
      requiredRoleDocumentUploaded: isRequiredRoleDocumentUploaded({
        documents: personDocuments,
        documentTypeIds:
          selectedRole.workerRole?.requiredDocumentTypes?.map((d) => d.id) ||
          (selectedRole.workerRole?.documentTypeId != null
            ? [selectedRole.workerRole.documentTypeId]
            : []),
        compareDate: documentCompareDate,
      }),
      requiredPassportUploaded: isRequiredPassportUploaded({
        documents: personDocuments,
        requirePassport: !!trip.requirePassport,
        compareDate: documentCompareDate,
      }),
      orgId: trip.orgId,
    });

    if (req.body?.version != null && Number(req.body.version) !== Number(assignment.version)) {
      return res.status(409).send({
        message: "Record was modified by another user. Please refresh and try again.",
      });
    }

    const adultChanged =
      assignment.agreementAdultFirstName !== agreement.agreementAdultFirstName ||
      assignment.agreementAdultLastName !== agreement.agreementAdultLastName ||
      assignment.agreementAdultEmail !== agreement.agreementAdultEmail ||
      assignment.agreementAdultRelationship !== agreement.agreementAdultRelationship;

    const agreementDate =
      agreement.agreementAccepted &&
      (!assignment.agreementAccepted ||
        assignment.agreementSignatureName !== agreement.agreementSignatureName ||
        adultChanged)
        ? agreement.agreementDate
        : agreement.agreementAccepted
          ? assignment.agreementDate || agreement.agreementDate
          : null;

    const medicalAgreementDate =
      medical.medicalAgreementAccepted &&
      (!assignment.medicalAgreementAccepted)
        ? medical.medicalAgreementDate
        : medical.medicalAgreementAccepted
          ? assignment.medicalAgreementDate || medical.medicalAgreementDate
          : null;

    await assignment.update({
      tripWorkerRoleId,
      willSelfFund,
      willRaiseFunds,
      licenseStatus,
      hasPreferredRoommate,
      preferredRoommateNames,
      participantCost,
      agreementAccepted: agreement.agreementAccepted,
      agreementSignatureName: agreement.agreementSignatureName,
      agreementDate,
      agreementAdultFirstName: agreement.agreementAdultFirstName,
      agreementAdultLastName: agreement.agreementAdultLastName,
      agreementAdultEmail: agreement.agreementAdultEmail,
      agreementAdultRelationship: agreement.agreementAdultRelationship,
      medicalAgreementAccepted: medical.medicalAgreementAccepted,
      medicalAgreementDate,
      isPregnant: pregnancy.isPregnant,
      pregnancyDueDate: pregnancy.pregnancyDueDate,
      status,
      version: Number(assignment.version) + 1,
    });

    await syncTripPeopleRoleOptions(assignment.id, travelOptions, selectedTravelOptionIds);

    const full = await loadApplicationAssignment(trip.id, peopleId);
    const travelOptionsWithSelection = await loadTravelOptionsForApplication(trip.id, assignment.id);
    res.send({
      message: "Application updated.",
      application: full,
      applicationStatus: status,
      alreadyApplied: true,
      participantAgreement,
      medicalAgreement,
      travelOptions: travelOptionsWithSelection,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.cancelApplication = async (req, res) => {
  try {
    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.status(400).send({ message: "Your account is not linked to a person profile." });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canBrowseOrg(req, trip.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const assignment = await loadApplicationAssignment(trip.id, peopleId);
    if (!assignment) {
      return res.status(404).send({ message: "Application not found." });
    }

    const result = await cancelApplicationAssignment(assignment);
    if (!result.ok) {
      return res.status(result.status).send({ message: result.message });
    }

    const full = await loadApplicationAssignment(trip.id, peopleId);
    res.send({
      message: "Application cancelled.",
      application: full,
      applicationStatus: "cancelled",
      alreadyApplied: true,
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.uncancelApplication = async (req, res) => {
  try {
    const peopleId = req.user?.personId;
    if (!peopleId) {
      return res.status(400).send({ message: "Your account is not linked to a person profile." });
    }

    const trip = await Trip.findByPk(req.params.id, { include: [orgInclude] });
    if (!trip || trip.status !== "active") {
      return res.status(404).send({ message: "Trip not found." });
    }
    if (!canBrowseOrg(req, trip.orgId)) {
      return res.status(403).send({ message: "Forbidden." });
    }

    const assignment = await loadApplicationAssignment(trip.id, peopleId);
    if (!assignment) {
      return res.status(404).send({ message: "Application not found." });
    }

    const result = await uncancelApplicationAssignment(assignment, { orgId: trip.orgId });
    if (!result.ok) {
      return res.status(result.status).send({ message: result.message });
    }

    const full = await loadApplicationAssignment(trip.id, peopleId);
    res.send({
      message: "Application uncancelled.",
      application: full,
      applicationStatus: result.status,
      alreadyApplied: true,
      canEdit: EDITABLE_APPLICATION_STATUSES.includes(result.status),
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
