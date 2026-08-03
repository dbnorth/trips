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
  get(id) {
    return apiClient.get(`/trips/${id}`);
  },
  create(data) {
    return apiClient.post("/trips", data);
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
