import db from "../models/index.js";
import { ROLE_TRIP_LEADER } from "../authorization/accessControl.js";
import { loadApprovalDocuments } from "./approvalDocuments.js";
import { missingNonDocumentItems } from "./myTripNextActions.js";
import { getMissingProfileFields, loadPersonForCompleteness } from "./tripParticipantApplicationStatus.js";

export const APPROVAL_INCOMPLETE_MESSAGE = "Complete the profile and application before approving.";

const PROFILE_ITEM = "Profile is not complete";

/**
 * What still blocks approving an application (Feature 122): missing profile fields, missing
 * application answers, and trip document blockers. Trip Leader rows have none.
 */
export const loadApprovalChecklist = async (assignment) => {
  const checklist = { profileMissing: [], applicationMissing: [], documentMissing: [] };
  const role =
    assignment.roleId != null ? await db.role.findByPk(assignment.roleId, { attributes: ["roleName"] }) : null;
  if (role?.roleName === ROLE_TRIP_LEADER) return checklist;

  const trip = await db.trip.findByPk(assignment.tripId, { attributes: ["id", "orgId"] });
  const person = await loadPersonForCompleteness(assignment.peopleId);
  const { approvalBlockers } = await loadApprovalDocuments({
    tripId: assignment.tripId,
    peopleId: assignment.peopleId,
    tripWorkerRoleId: assignment.tripWorkerRoleId,
    isPregnant: assignment.isPregnant,
  });
  checklist.profileMissing = getMissingProfileFields(person, { orgId: trip?.orgId });
  checklist.applicationMissing = (await missingNonDocumentItems(assignment, trip, person)).filter(
    (label) => label !== PROFILE_ITEM
  );
  checklist.documentMissing = approvalBlockers;
  return checklist;
};

export const isApprovalBlocked = ({ profileMissing, applicationMissing, documentMissing }) =>
  profileMissing.length + applicationMissing.length + documentMissing.length > 0;
