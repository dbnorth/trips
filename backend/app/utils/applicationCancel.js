import db from "../models/index.js";
import {
  loadPersonForCompleteness,
  resolvePreApprovedOrIncompleteStatus,
} from "./tripParticipantApplicationStatus.js";
import { loadOrganizationAgreement, loadOrganizationMedicalAgreement } from "./organizationAgreement.js";
import { normalizeApplicationPregnancy } from "./pregnancyFields.js";
import { findReservationForPerson, withCapacityFields } from "./tripRoleCapacity.js";

const TripWorkerRole = db.tripWorkerRole;

export const CANCELABLE_APPLICATION_STATUSES = ["incomplete", "pre_approved", "approved"];

const resolveUncancelStatus = async (assignment, orgId) => {
  const person = await loadPersonForCompleteness(assignment.peopleId);
  const agreement = orgId != null ? await loadOrganizationAgreement(orgId) : null;
  const agreementRequired = !!agreement?.exists && !!agreement?.content?.trim();
  const medicalAgreement = orgId != null ? await loadOrganizationMedicalAgreement(orgId) : null;
  const medicalAgreementRequired =
    !!medicalAgreement?.exists &&
    !!medicalAgreement?.content?.trim() &&
    (person?.takesMedication === true || person?.takesMedication === 1);
  const pregnancy = normalizeApplicationPregnancy(assignment, { gender: person?.gender ?? null });
  return resolvePreApprovedOrIncompleteStatus({
    person,
    tripWorkerRoleId: assignment.tripWorkerRoleId,
    willSelfFund: !!assignment.willSelfFund,
    willRaiseFunds: !!assignment.willRaiseFunds,
    licenseStatus: assignment.licenseStatus || null,
    hasPreferredRoommate: !!assignment.hasPreferredRoommate,
    preferredRoommateNames: assignment.preferredRoommateNames || null,
    agreementRequired,
    agreementAccepted: !!assignment.agreementAccepted,
    agreementSignatureName: assignment.agreementSignatureName || null,
    agreementAdultFirstName: assignment.agreementAdultFirstName || null,
    agreementAdultLastName: assignment.agreementAdultLastName || null,
    agreementAdultEmail: assignment.agreementAdultEmail || null,
    agreementAdultRelationship: assignment.agreementAdultRelationship || null,
    medicalAgreementRequired,
    medicalAgreementAccepted: !!assignment.medicalAgreementAccepted,
    isPregnant: pregnancy.ok ? pregnancy.isPregnant : null,
    pregnancyDueDate: pregnancy.ok ? pregnancy.pregnancyDueDate : null,
    orgId,
  });
};

export const cancelApplicationAssignment = async (assignment) => {
  if (!CANCELABLE_APPLICATION_STATUSES.includes(assignment.status)) {
    return {
      ok: false,
      status: 400,
      message: `Cannot cancel an application with status '${assignment.status}'.`,
    };
  }
  await assignment.update({
    status: "cancelled",
    version: Number(assignment.version || 1) + 1,
  });
  return { ok: true, assignment };
};

export const uncancelApplicationAssignment = async (assignment, { orgId } = {}) => {
  if (assignment.status !== "cancelled") {
    return {
      ok: false,
      status: 400,
      message: "Only cancelled applications can be uncancelled.",
    };
  }

  const tripWorkerRoleId = assignment.tripWorkerRoleId;
  if (!tripWorkerRoleId) {
    return {
      ok: false,
      status: 400,
      message: "Application has no role assignment.",
    };
  }

  const twr = await TripWorkerRole.findByPk(tripWorkerRoleId, { attributes: ["id", "quantity"] });
  if (!twr) {
    return { ok: false, status: 400, message: "Role is no longer available on this trip." };
  }
  const reservation = await findReservationForPerson(assignment.tripId, assignment.peopleId);
  const reservedForRole = Number(reservation?.tripWorkerRoleId) === Number(tripWorkerRoleId);
  const [role] = await withCapacityFields(assignment.tripId, [twr]);
  if (!reservedForRole && role.availableCount < 1) {
    return {
      ok: false,
      status: 400,
      message: "This role is full. Uncancel is not available.",
    };
  }

  const nextStatus = await resolveUncancelStatus(assignment, orgId);
  await assignment.update({
    status: nextStatus,
    version: Number(assignment.version || 1) + 1,
  });
  return { ok: true, assignment, status: nextStatus };
};
