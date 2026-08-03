import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/people", { params });
  },
  getOrgTripLeaders(orgId) {
    return apiClient.get("/people/org-trip-leaders", { params: { orgId } });
  },
  get(id) {
    return apiClient.get(`/people/${id}`);
  },
  create(data) {
    return apiClient.post("/people", data);
  },
  update(id, data) {
    return apiClient.put(`/people/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/people/${id}`);
  },
  uploadPicture(id, file) {
    const form = new FormData();
    form.append("picture", file);
    return apiClient.put(`/people/${id}/picture`, form);
  },
  getPictureUrl(picture) {
    if (!picture) return null;
    const p = String(picture);
    if (p.startsWith("uploads/") || p.startsWith("images/")) return `${getBaseUrl()}${p}`;
    // people/... — new uploads under images/; older files may live under uploads/
    return `${getBaseUrl()}images/${p}`;
  },
};
