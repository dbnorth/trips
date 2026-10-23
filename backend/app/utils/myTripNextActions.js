import db from "../models/index.js";
import {
  arePersonDocumentsUploaded,
  isProfileComplete,
  isRequiredPassportUploaded,
  isUnder18,
  loadPersonDocumentsForCompleteness,
  loadPersonForCompleteness,
  loadWorkerRoleDocumentRequirements,
  missingRequiredRoleDocuments,
  requiredRoleDocumentLabel,
  tripDocumentCompareDate,
} from "./tripParticipantApplicationStatus.js";
import { getApplicationMissingItemLabels, travelOptionsIncompleteMessage } from "./applicationMissingItems.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "./organizationAgreement.js";
import { normalizeApplicationPregnancy } from "./pregnancyFields.js";
import { amountOwed, participantTotals } from "./participantTotals.js";

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
  const names = missingRoleDocuments.map(requiredRoleDocumentLabel).filter(Boolean);
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
  if (!arePersonDocumentsUploaded(personDocuments)) {
    names.push("A file for every profile document");
  }
  return names;
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
const missingNonDocumentItems = async (assignmentRow, trip, person) => {
  const assignment = assignmentRow.toJSON();
  const orgId = trip.orgId;
  const agreement = orgId != null ? await loadOrganizationAgreement(orgId) : null;
  const medicalAgreement = orgId != null ? await loadOrganizationMedicalAgreement(orgId) : null;
  const medicalAgreementRequired =
    !!medicalAgreement?.exists &&
    !!medicalAgreement?.content?.trim() &&
    (person?.takesMedication === true || person?.takesMedication === 1);
  const pregnancy = normalizeApplicationPregnancy(assignment, { gender: person?.gender ?? null });
  const travelMsg = await travelOptionsMessageFor(trip.id, assignment.id);
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
  Math.round(Number((await db.tripDonation.sum("amount", { where: { tripId, personId } })) || 0) * 100) /
  100;

const flightSegmentCount = async (tripPeopleRoleId) => {
  const flight = await db.tripFlight.findOne({
    where: { tripPeopleRoleId },
    attributes: ["id"],
  });
  if (!flight) return 0;
  return db.tripFlightSegment.count({ where: { tripFlightId: flight.id } });
};

/**
 * Next actions for the signed-in person's assignment on one trip (Feature 60).
 * `cache.personDocuments` is loaded once per person and reused across trips.
 */
export const loadMyTripNextActions = async (assignment, trip, cache = {}) => {
  if (!trip?.startDate || String(trip.startDate) < todayDateOnly()) return [];

  if (assignment.status === "incomplete") {
    if (!cache.personDocuments) {
      cache.personDocuments = await loadPersonDocumentsForCompleteness(assignment.peopleId);
    }
    const missingDocuments = await missingDocumentNames({
      assignment,
      trip,
      personDocuments: cache.personDocuments,
    });
    if (!missingDocuments.length) {
      if (cache.person === undefined) {
        cache.person = await loadPersonForCompleteness(assignment.peopleId);
      }
      const missingItems = await missingNonDocumentItems(assignment, trip, cache.person);
      if (!missingItems.length) return [{ code: "submit-application" }];
    }
    return [{ code: "complete-application", missingDocuments }];
  }

  if (assignment.status === "applied") return [{ code: "wait-approval" }];

  if (assignment.status !== "approved") return [];

  const actions = [];
  const amountRaised = await amountRaisedFor(trip.id, assignment.peopleId);
  const deposit = toMoney(trip.deposit);
  if (deposit != null && deposit > 0 && amountRaised < deposit) {
    actions.push({ code: "make-deposit", amountRaised, deposit });
  } else {
    const { totalTripCost } = await participantTotals(trip, assignment);
    const owed = amountOwed(totalTripCost, amountRaised);
    if (owed != null && owed > 0) actions.push({ code: "make-donation", amountOwed: owed });
  }

  if (assignment.flightPurchaseOption === "self" && (await flightSegmentCount(assignment.id)) === 0) {
    actions.push({ code: "enter-flights" });
  }
  return actions.length ? actions : [{ code: "all-ready" }];
};
