import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll() {
    return apiClient.get("/trips");
  },
  getBrowseOrgs() {
    return apiClient.get("/trips/browse/orgs");
  },
  getBrowseTrips(orgId) {
    return apiClient.get("/trips/browse", { params: { orgId } });
  },
  getMyBrowseTrips(orgId) {
    return apiClient.get("/trips/browse/mine", { params: { orgId } });
  },
  getBrowseTrip(id) {
    return apiClient.get(`/trips/browse/${id}`);
  },
  applyToTrip(id, data = {}) {
    return apiClient.post(`/trips/browse/${id}/apply`, data);
  },
  getApplication(id) {
    return apiClient.get(`/trips/browse/${id}/application`);
  },
  updateApplication(id, data = {}) {
    return apiClient.put(`/trips/browse/${id}/application`, data);
  },
  cancelApplication(id) {
    return apiClient.post(`/trips/browse/${id}/application/cancel`);
  },
  uncancelApplication(id) {
    return apiClient.post(`/trips/browse/${id}/application/uncancel`);
  },
  get(id) {
    return apiClient.get(`/trips/${id}`);
  },
  getStatus(id) {
    return apiClient.get(`/trips/${id}/status`);
  },
  getRooming(id) {
    return apiClient.get(`/trips/${id}/rooming`);
  },
  updateRooming(id, data) {
    return apiClient.put(`/trips/${id}/rooming`, data);
  },
  getFlights(id) {
    return apiClient.get(`/trips/${id}/flights`);
  },
  updateFlight(tripId, tripPeopleRoleId, data) {
    return apiClient.put(`/trips/${tripId}/flights/${tripPeopleRoleId}`, data);
  },
  getFlightSegments(tripId, tripPeopleRoleId) {
    return apiClient.get(`/trips/${tripId}/flights/${tripPeopleRoleId}/segments`);
  },
  updateFlightSegments(tripId, tripPeopleRoleId, data) {
    return apiClient.put(`/trips/${tripId}/flights/${tripPeopleRoleId}/segments`, data);
  },
  getTeamEmailTemplates(id) {
    return apiClient.get(`/trips/${id}/team-email/templates`);
  },
  previewTeamEmail(id, data) {
    return apiClient.post(`/trips/${id}/team-email/preview`, data);
  },
  sendTeamEmail(id, data) {
    return apiClient.post(`/trips/${id}/team-email`, data);
  },
  create(data) {
    return apiClient.post("/trips", data);
  },
  copy(id, data) {
    return apiClient.post(`/trips/${id}/copy`, data);
  },
  update(id, data) {
    return apiClient.put(`/trips/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/trips/${id}`);
  },
  uploadImage(id, file) {
    const form = new FormData();
    form.append("image", file);
    return apiClient.put(`/trips/${id}/image`, form);
  },
  uploadArrivalPdf(id, file) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post(`/trips/${id}/arrival-pdf`, form);
  },
  async openArrivalPdf(id) {
    const response = await apiClient.get(`/trips/${id}/arrival-pdf`, { responseType: "blob" });
    window.open(URL.createObjectURL(response.data), "_blank");
  },
  removeArrivalPdf(id) {
    return apiClient.delete(`/trips/${id}/arrival-pdf`);
  },
  importTripMaster(id, file) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post(`/trips/${id}/import-trip-master`, form);
  },
  getImageUrl(image) {
    if (!image) return null;
    // Legacy path: uploads/trips/...
    if (String(image).startsWith("uploads/")) return `${getBaseUrl()}${image}`;
    // Current path stored as trips/... served from /images/
    return `${getBaseUrl()}images/${image}`;
  },
};
