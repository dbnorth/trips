import db from "../models/index.js";
import {
  isDoctorPermissionUploaded,
  isProfileComplete,
  isRequiredPassportUploaded,
  loadDoctorPermissionTypes,
  isUnder18,
  loadPersonDocumentsForCompleteness,
  loadPersonForCompleteness,
  loadWorkerRoleDocumentRequirements,
  missingRequiredRoleDocuments,
  requiredRoleDocumentMessage,
  tripDocumentCompareDate,
} from "./tripParticipantApplicationStatus.js";
import { getApplicationMissingItemLabels, travelOptionsIncompleteMessage } from "./applicationMissingItems.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "./organizationAgreement.js";
import { normalizeApplicationPregnancy } from "./pregnancyFields.js";
import { amountOwed, participantTotals } from "./participantTotals.js";
import { participantFlightDates, participantTravelDates } from "./tripDays.js";
import { countedDonations } from "./donationCounting.js";

const todayDateOnly = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const toMoney = (value) =>
  value == null || value === "" || Number.isNaN(Number(value)) ? null : Number(value);

/** Document-related reasons an application is incomplete, in display order. */
const missingDocumentNames = async ({ assignment, trip, personDocuments }) => {
  const compareDate = tripDocumentCompareDate(trip);
  const { requiredDocumentTypes, requiredSpecializations } =
    await loadWorkerRoleDocumentRequirements(assignment.tripWorkerRoleId);
  const missingRoleDocuments = missingRequiredRoleDocuments({
    documents: personDocuments,
    requiredDocumentTypes,
    compareDate,
    requiredSpecializations,
  });
  const names = missingRoleDocuments.map((docType) =>
    requiredRoleDocumentMessage(docType, { documents: personDocuments, compareDate, requiredSpecializations })
  );
  const passportListed = missingRoleDocuments.some(
    (docType) => String(docType.type || "").toLowerCase() === "passport"
  );
  if (
    !passportListed &&
    !isRequiredPassportUploaded({
      documents: personDocuments,
      requirePassport: !!trip.requirePassport,
      compareDate,
    })
  ) {
    names.push("Passport");
  }
  const doctorPermissionListed = missingRoleDocuments.some((docType) => docType.type === "doctor_permission");
  if (
    !doctorPermissionListed &&
    !isDoctorPermissionUploaded({
      documents: personDocuments,
      isPregnant: assignment.isPregnant,
      doctorPermissionRequired: (await loadDoctorPermissionTypes(trip.orgId)).length > 0,
      compareDate,
    })
  ) {
    names.push("Doctor Permission");
  }
  return names;
};

/** Documents one trip requires of the person, each `{ name, uploaded, missingText }`, in display order. */
export const requiredTripDocuments = async ({ assignment, trip, personDocuments }) => {
  const compareDate = tripDocumentCompareDate(trip);
  const { requiredDocumentTypes = [], requiredSpecializations } =
    await loadWorkerRoleDocumentRequirements(assignment.tripWorkerRoleId);
  const missingIds = new Set(
    missingRequiredRoleDocuments({
      documents: personDocuments,
      requiredDocumentTypes,
      compareDate,
      requiredSpecializations,
    }).map((docType) => Number(docType.id))
  );
  const documents = requiredDocumentTypes.map((docType) => {
    const uploaded = !missingIds.has(Number(docType.id));
    return {
      name: docType.description || docType.name || "Required document",
      uploaded,
      missingText: uploaded
        ? null
        : requiredRoleDocumentMessage(docType, { documents: personDocuments, compareDate, requiredSpecializations }),
    };
  });
  const roleLists = (type) =>
    requiredDocumentTypes.some((docType) => String(docType.type || "").toLowerCase() === type);
  if (trip.requirePassport && !roleLists("passport")) {
    const uploaded = isRequiredPassportUploaded({ documents: personDocuments, requirePassport: true, compareDate });
    documents.push({ name: "Passport", uploaded, missingText: uploaded ? null : "Passport" });
  }
  if (
    assignment.isPregnant === true &&
    !roleLists("doctor_permission") &&
    (await loadDoctorPermissionTypes(trip.orgId)).length > 0
  ) {
    const uploaded = isDoctorPermissionUploaded({
      documents: personDocuments,
      isPregnant: true,
      doctorPermissionRequired: true,
      compareDate,
    });
    documents.push({ name: "Doctor Permission", uploaded, missingText: uploaded ? null : "Doctor Permission" });
  }
  return documents;
};

const DOCUMENTS_DUE_DAYS_BEFORE = 90;

const daysBefore = (ymd, days) => {
  const [y, m, d] = String(ymd).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
};

/** The trip's documents due date (`YYYY-MM-DD`, 90 days before the start date), or null without a start date. */
export const documentsDueDate = (trip) =>
  trip?.startDate ? daysBefore(trip.startDate, DOCUMENTS_DUE_DAYS_BEFORE) : null;

/** One assignment's missing documents by the `upload-documents` rule. */
export const loadMissingTripDocuments = async (assignment, trip) =>
  missingDocumentNames({
    assignment,
    trip,
    personDocuments: await loadPersonDocumentsForCompleteness(assignment.peopleId),
  });

/** The person's upcoming trips in any organization, with the documents each requires (Feature 112). */
export const loadMyTripDocuments = async (peopleId) => {
  if (!peopleId) return [];
  const assignments = await db.tripPeopleRole.findAll({
    where: { peopleId, status: { [db.Sequelize.Op.in]: ["incomplete", "pre_approved", "approved"] } },
    include: [
      {
        model: db.trip,
        as: "trip",
        required: true,
        where: { startDate: { [db.Sequelize.Op.gte]: todayDateOnly() } },
      },
    ],
    order: [
      [{ model: db.trip, as: "trip" }, "startDate", "ASC"],
      [{ model: db.trip, as: "trip" }, "name", "ASC"],
    ],
  });
  if (!assignments.length) return [];
  const personDocuments = await loadPersonDocumentsForCompleteness(peopleId);
  const trips = [];
  for (const assignment of assignments) {
    const trip = assignment.trip;
    const documents = await requiredTripDocuments({ assignment, trip, personDocuments });
    if (!documents.length) continue;
    const startDate = String(trip.startDate).slice(0, 10);
    trips.push({
      tripId: trip.id,
      tripName: trip.name,
      startDate,
      dueDate: daysBefore(startDate, DOCUMENTS_DUE_DAYS_BEFORE),
      documents,
    });
  }
  return trips;
};

const travelOptionsMessageFor = async (tripId, tripPeopleRoleId) => {
  const options = await db.tripTravelOption.findAll({
    where: { tripId },
    attributes: ["id", "setNumber"],
  });
  const selected = await db.tripPeopleRoleOption.findAll({
    where: { tripPeopleRoleId, selected: true },
    attributes: ["tripTravelOptionId"],
  });
  return travelOptionsIncompleteMessage(
    options.map((o) => o.toJSON()),
    selected.map((row) => Number(row.tripTravelOptionId))
  );
};

/** Trip Status board checklist items (Feature 28) other than documents. */
export const missingNonDocumentItems = async (assignmentRow, trip, person) => {
  const assignment = typeof assignmentRow.toJSON === "function" ? assignmentRow.toJSON() : assignmentRow;
  const orgId = trip.orgId;
  const agreement = orgId != null ? await loadOrganizationAgreement(orgId) : null;
  const medicalAgreement = orgId != null ? await loadOrganizationMedicalAgreement(orgId) : null;
  const medicalAgreementRequired =
    !!medicalAgreement?.exists &&
    !!medicalAgreement?.content?.trim() &&
    (person?.takesMedication === true || person?.takesMedication === 1);
  const pregnancy = normalizeApplicationPregnancy(assignment, { gender: person?.gender ?? null });
  const travelMsg = await travelOptionsMessageFor(trip.id, assignment.id ?? null);
  return getApplicationMissingItemLabels({
    profileComplete: isProfileComplete(person, { orgId }),
    tripWorkerRoleId: assignment.tripWorkerRoleId,
    willSelfFund: !!assignment.willSelfFund,
    willRaiseFunds: !!assignment.willRaiseFunds,
    hasPreferredRoommate: !!assignment.hasPreferredRoommate,
    preferredRoommateNames: assignment.preferredRoommateNames || null,
    flightPurchaseOption: assignment.flightPurchaseOption || null,
    preferredDepartureAirportId: assignment.preferredDepartureAirportId ?? null,
    preferredReturnAirportId: assignment.preferredReturnAirportId ?? null,
    preferredCabinClass: assignment.preferredCabinClass || null,
    preferredAirlineId: assignment.preferredAirlineId ?? null,
    preferredRefundableTicket:
      assignment.preferredRefundableTicket === true || assignment.preferredRefundableTicket === false
        ? assignment.preferredRefundableTicket
        : null,
    gender: person?.gender ?? null,
    isPregnant: pregnancy.ok ? pregnancy.isPregnant : null,
    pregnancyDueDate: pregnancy.ok ? pregnancy.pregnancyDueDate : null,
    agreementRequired: !!agreement?.exists && !!agreement?.content?.trim(),
    agreementAccepted: !!assignment.agreementAccepted,
    agreementSignatureName: assignment.agreementSignatureName || null,
    under18: isUnder18(person?.birthDate),
    agreementAdultFirstName: assignment.agreementAdultFirstName || null,
    agreementAdultLastName: assignment.agreementAdultLastName || null,
    agreementAdultEmail: assignment.agreementAdultEmail || null,
    agreementAdultRelationship: assignment.agreementAdultRelationship || null,
    medicalAgreementRequired,
    medicalAgreementAccepted: !!assignment.medicalAgreementAccepted,
    travelOptionsComplete: !travelMsg,
    travelOptionsMessage: travelMsg,
  });
};

const amountRaisedFor = async (tripId, personId) =>
  Math.round(
    Number((await db.tripDonation.sum("amount", { where: countedDonations({ tripId, personId }) })) || 0) * 100
  ) /
  100;

/** First Arrival segment's departure, or null when the person has none. */
const firstDeparture = async (tripPeopleRoleId) => {
  if (!tripPeopleRoleId) return null;
  const flight = await db.tripFlight.findOne({
    where: { tripPeopleRoleId },
    attributes: ["id"],
  });
  if (!flight) return null;
  const segment = await db.tripFlightSegment.findOne({
    where: { tripFlightId: flight.id, segmentType: "arrival" },
    include: [{ model: db.airport, as: "departureAirport", attributes: ["code"] }],
    order: [["segmentNumber", "ASC"]],
  });
  if (!segment) return null;
  const time = segment.departureTime ? String(segment.departureTime).slice(0, 5) : null;
  return {
    airportCode: segment.departureAirport?.code || null,
    date: segment.departureDate ? String(segment.departureDate).slice(0, 10) : null,
    time: time || null,
  };
};

/**
 * Read-only summary for a participant Home card (Feature 138).
 * Reuses `cache.personDocuments` from next-action loading.
 */
export const loadHomeCard = async (assignment, trip, cache = {}) => {
  const amountRaised = await amountRaisedFor(trip.id, assignment.peopleId);
  const { totalTripCost } = await participantTotals(trip, assignment);
  let documentsUploaded = null;
  let documentsRequired = null;
  if (assignment.peopleId) {
    if (!cache.personDocuments) {
      cache.personDocuments = await loadPersonDocumentsForCompleteness(assignment.peopleId);
    }
    const documents = await requiredTripDocuments({
      assignment,
      trip,
      personDocuments: cache.personDocuments,
    });
    if (documents.length) {
      documentsRequired = documents.length;
      documentsUploaded = documents.filter((document) => document.uploaded).length;
    }
  }
  return {
    amountRaised,
    totalTripCost,
    documentsUploaded,
    documentsRequired,
    departure: await firstDeparture(assignment.id),
  };
};

const flightSegmentCount = async (tripPeopleRoleId) => {
  const flight = await db.tripFlight.findOne({
    where: { tripPeopleRoleId },
    attributes: ["id"],
  });
  if (!flight) return 0;
  return db.tripFlightSegment.count({ where: { tripFlightId: flight.id } });
};

/** The deposit action while the deposit isn't met, else the donation action while anything is owed. */
const donationActions = async (assignment, trip) => {
  const amountRaised = await amountRaisedFor(trip.id, assignment.peopleId);
  const deposit = toMoney(trip.deposit);
  if (deposit != null && deposit > 0 && amountRaised < deposit) {
    return [{ code: "make-deposit", amountRaised, deposit }];
  }
  const { totalTripCost } = await participantTotals(trip, assignment);
  const owed = amountOwed(totalTripCost, amountRaised);
  return owed != null && owed > 0 ? [{ code: "make-donation", amountOwed: owed }] : [];
};

/**
 * Next actions for the signed-in person's assignment on one trip (Feature 60).
 * `cache.personDocuments` is loaded once per person and reused across trips.
 */
export const loadMyTripNextActions = async (assignment, trip, cache = {}) => {
  if (!trip?.startDate || String(trip.startDate) < todayDateOnly()) return [];

  if (assignment.status === "pre_approved") {
    if (!cache.personDocuments) {
      cache.personDocuments = await loadPersonDocumentsForCompleteness(assignment.peopleId);
    }
    const missingDocuments = await missingDocumentNames({
      assignment,
      trip,
      personDocuments: cache.personDocuments,
    });
    const documentsAction = missingDocuments.length
      ? {
          code: "upload-documents",
          missingDocuments,
          dueDate: daysBefore(trip.startDate, DOCUMENTS_DUE_DAYS_BEFORE),
        }
      : { code: "wait-approval" };
    return [documentsAction, ...(await donationActions(assignment, trip))];
  }

  if (assignment.status === "incomplete") {
    if (cache.person === undefined) {
      cache.person = await loadPersonForCompleteness(assignment.peopleId);
    }
    const missingItems = await missingNonDocumentItems(assignment, trip, cache.person);
    if (!missingItems.length) return [{ code: "submit-application" }];
    const profileIncomplete = !isProfileComplete(cache.person, { orgId: trip.orgId });
    return [
      {
        code: "complete-application",
        applicationIncomplete: missingItems.length > (profileIncomplete ? 1 : 0),
        profileIncomplete,
      },
    ];
  }

  if (assignment.status !== "approved") return [];

  const actions = await donationActions(assignment, trip);

  if (assignment.flightPurchaseOption === "self" && (await flightSegmentCount(assignment.id)) === 0) {
    actions.push({ code: "enter-flights" });
  }

  const { arrivalDate, departureDate } = await participantTravelDates(trip, assignment.id);
  const { flightArrivalDate, flightDepartureDate } = await participantFlightDates(assignment.id);
  const canEditFlights = assignment.flightPurchaseOption === "self";
  if (arrivalDate && flightArrivalDate && arrivalDate !== flightArrivalDate) {
    actions.push({
      code: "arrival-flight-mismatch",
      flightDate: flightArrivalDate,
      plannedDate: arrivalDate,
      canEditFlights,
    });
  }
  if (departureDate && flightDepartureDate && departureDate !== flightDepartureDate) {
    actions.push({
      code: "return-flight-mismatch",
      flightDate: flightDepartureDate,
      plannedDate: departureDate,
      canEditFlights,
    });
  }
  return actions.length ? actions : [{ code: "all-ready" }];
};
