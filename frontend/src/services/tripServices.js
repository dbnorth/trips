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
  getImageUrl(image) {
    if (!image) return null;
    // Legacy path: uploads/trips/...
    if (String(image).startsWith("uploads/")) return `${getBaseUrl()}${image}`;
    // Current path stored as trips/... served from /images/
    return `${getBaseUrl()}images/${image}`;
  },
};
