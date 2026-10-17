import apiClient, { getBaseUrl } from "./services.js";
import Utils from "../config/utils.js";

const downloadFile = async (path, filename, errorMessage = "Unable to download CSV.") => {
  const user = Utils.getStore("user");
  const headers = { Authorization: `Bearer ${user?.token}` };
  const orgId = Utils.effectiveOrgId(user);
  if (orgId != null && orgId !== "") {
    headers["X-Acting-Organization-Id"] = String(orgId);
  }
  const res = await fetch(`${getBaseUrl()}${path}`, { headers });
  if (!res.ok) {
    let message = errorMessage;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export default {
  participantsCsv(tripId) {
    return downloadFile(`export/trips/${tripId}/participants.csv`, `participants-${tripId}.csv`);
  },
  donorsCsv(tripId) {
    return downloadFile(`export/trips/${tripId}/donors.csv`, `donors-${tripId}.csv`);
  },
  donationsCsv(tripId) {
    return downloadFile(`export/trips/${tripId}/donations.csv`, `donations-${tripId}.csv`);
  },
  roomListPdf(tripId, tripName) {
    return downloadFile(
      `trips/${tripId}/rooming/pdf`,
      `Room List - ${tripName}.pdf`,
      "Unable to download room list PDF."
    );
  },
  flightsPdf(tripId, tripName) {
    return downloadFile(
      `trips/${tripId}/flights/pdf`,
      `Flights - ${tripName}.pdf`,
      "Unable to download flights PDF."
    );
  },
};
