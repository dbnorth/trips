import {
  canAccessTrip,
  isOrgAdminForOrg,
  isSystemAdmin,
  isTripLeaderForTrip,
} from "../authorization/accessControl.js";
import {
  buildParticipantDocumentsData,
  renderParticipantDocumentsPdf,
} from "../utils/participantDocumentsPdf.js";
import { sendPdf } from "../utils/pdf.js";

const exports = {};

const canManageTripPeople = async (req, tripId) => {
  const access = await canAccessTrip(req, tripId);
  if (!access.ok) return { ok: false, status: 404 };
  if (isOrgAdminForOrg(req, access.trip.orgId) || isSystemAdmin(req)) return { ok: true };
  if (isTripLeaderForTrip(req, tripId)) return { ok: true };
  return { ok: false, status: 403 };
};

exports.documentsPdf = async (req, res) => {
  try {
    const { id: tripId, assignmentId } = req.params;
    const manage = await canManageTripPeople(req, tripId);
    if (!manage.ok) {
      return res.status(manage.status).send({
        message: manage.status === 404 ? "Trip not found." : "Forbidden.",
      });
    }

    const data = await buildParticipantDocumentsData(tripId, assignmentId);
    if (!data) return res.status(404).send({ message: "Participant not found." });
    sendPdf(res, await renderParticipantDocumentsPdf(data), data.fileName);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

export default exports;
