import db from "../models/index.js";
import {
  arePersonDocumentsUploaded,
  isDoctorPermissionUploaded,
  isRequiredPassportUploaded,
  isRequiredRoleDocumentUploaded,
  loadDoctorPermissionTypes,
  loadWorkerRoleDocumentRequirements,
  tripDocumentCompareDate,
} from "./tripParticipantApplicationStatus.js";

export const APPROVAL_DOCUMENTS_MESSAGE = "Upload and review all required documents before approving.";

const hasFile = (doc) => !!doc.documentFileName && String(doc.documentFileName).trim() !== "";

const documentType = (doc) => doc.documentType?.type ?? null;

const loadDocuments = async (personId) =>
  (
    await db.personDocument.findAll({
      where: { personId },
      include: [
        {
          model: db.documentType,
          as: "documentType",
          attributes: ["id", "description", "type", "hasExpirationDate", "documentNumberRequired"],
        },
        {
          model: db.personDocumentSpecialization,
          as: "specializations",
          attributes: ["id", "documentTypeSpecializationId", "specializationDate", "documentFileName"],
          include: [
            { model: db.documentTypeSpecialization, as: "documentTypeSpecialization", attributes: ["name"] },
          ],
        },
      ],
      order: [["id", "ASC"]],
    })
  ).map((row) => row.toJSON());

/**
 * The participant's document requirements for the trip (worker role documents, then passport when
 * required, then Doctor Permission when pregnant and required), each with her documents of that type,
 * and what still blocks approval (Feature 104).
 */
export const loadApprovalDocuments = async ({ tripId, peopleId, tripWorkerRoleId, isPregnant }) => {
  const trip = await db.trip.findByPk(tripId, {
    attributes: ["id", "orgId", "startDate", "endDate", "requirePassport"],
  });
  const compareDate = tripDocumentCompareDate(trip);
  const documents = await loadDocuments(peopleId);
  const { requiredDocumentTypes, requiredSpecializations } =
    await loadWorkerRoleDocumentRequirements(tripWorkerRoleId);
  const tripWorkerRole = tripWorkerRoleId
    ? await db.tripWorkerRole.findByPk(tripWorkerRoleId, {
        include: [{ model: db.workerRole, as: "workerRole", attributes: ["name"] }],
      })
    : null;

  const requirements = (requiredDocumentTypes || []).map((docType) => ({
    key: `document-type-${docType.id}`,
    label: docType.description || "Required document",
    type: docType.type ?? null,
    requiredSpecializations: requiredSpecializations
      .filter((s) => Number(s.documentTypeId) === Number(docType.id))
      .map((s) => ({ id: s.id, name: s.name })),
    matches: (doc) => Number(doc.documentTypeId) === Number(docType.id),
    qualifies: (doc) =>
      isRequiredRoleDocumentUploaded({
        documents: [doc],
        documentTypeIds: [docType.id],
        compareDate,
        requiredSpecializations,
      }),
  }));
  if (trip?.requirePassport && !requirements.some((r) => r.type === "passport")) {
    requirements.push({
      key: "passport",
      label: "Passport",
      matches: (doc) => documentType(doc) === "passport",
      qualifies: (doc) => isRequiredPassportUploaded({ documents: [doc], requirePassport: true, compareDate }),
    });
  }
  const pregnant = isPregnant === true || isPregnant === 1;
  if (
    pregnant &&
    !requirements.some((r) => r.type === "doctor_permission") &&
    (await loadDoctorPermissionTypes(trip?.orgId)).length > 0
  ) {
    requirements.push({
      key: "doctor-permission",
      label: "Doctor Permission",
      matches: (doc) => documentType(doc) === "doctor_permission",
      qualifies: (doc) =>
        isDoctorPermissionUploaded({
          documents: [doc],
          isPregnant: true,
          doctorPermissionRequired: true,
          compareDate,
        }),
    });
  }

  const approvalBlockers = [];
  const listed = requirements.map((requirement) => {
    const ofType = documents.filter(requirement.matches).map((doc) => ({
      id: doc.id,
      description: doc.documentType?.description ?? null,
      documentNumber: doc.documentNumber ?? null,
      issueDate: doc.issueDate ?? null,
      expirationDate: doc.expirationDate ?? null,
      documentNumberRequired: !!doc.documentType?.documentNumberRequired,
      hasExpirationDate: !!doc.documentType?.hasExpirationDate,
      hasFile: hasFile(doc),
      reviewed: !!doc.reviewed,
      qualifies: requirement.qualifies(doc),
      specializations: (doc.specializations || []).map((s) => ({
        id: s.id,
        documentTypeSpecializationId: s.documentTypeSpecializationId,
        name: s.documentTypeSpecialization?.name ?? null,
        date: s.specializationDate ?? null,
        hasFile: hasFile(s),
      })),
    }));
    if (!ofType.some((doc) => doc.qualifies)) {
      approvalBlockers.push(`${requirement.label}: not uploaded`);
    } else if (!ofType.some((doc) => doc.qualifies && doc.reviewed)) {
      approvalBlockers.push(`${requirement.label}: not reviewed`);
    }
    return {
      key: requirement.key,
      label: requirement.label,
      requiredSpecializations: requirement.requiredSpecializations || [],
      documents: ofType,
    };
  });
  const allDocumentsHaveFiles = arePersonDocumentsUploaded(documents);
  if (!allDocumentsHaveFiles) approvalBlockers.push("A file for every profile document");

  return {
    workerRoleName: tripWorkerRole?.workerRole?.name ?? null,
    requirements: listed,
    allDocumentsHaveFiles,
    approvalBlockers,
  };
};
