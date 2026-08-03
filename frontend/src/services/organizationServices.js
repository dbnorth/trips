import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll() {
    return apiClient.get("/organizations");
  },
  getAllForMenu() {
    return apiClient.get("/organizations", { skipOrgScope: true });
  },
  get(id) {
    return apiClient.get(`/organizations/${id}`);
  },
  create(data) {
    return apiClient.post("/organizations", data);
  },
  update(id, data) {
    return apiClient.put(`/organizations/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/organizations/${id}`);
  },
  uploadLogo(id, file) {
    const form = new FormData();
    form.append("logo", file);
    return apiClient.put(`/organizations/${id}/logo`, form);
  },
  getAgreement(id) {
    return apiClient.get(`/organizations/${id}/agreement`);
  },
  saveAgreement(id, content) {
    return apiClient.put(`/organizations/${id}/agreement`, { content });
  },
  getLogoUrl(logo) {
    if (!logo) return null;
    // Legacy path: uploads/org-logos/...
    if (String(logo).startsWith("org-logos/")) {
      return `${getBaseUrl()}uploads/${logo}`;
    }
    // New path: images/logos/...
    return `${getBaseUrl()}images/${logo}`;
  },
};
