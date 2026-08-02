import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/email-templates", { params });
  },
  getCopySources(params = {}) {
    return apiClient.get("/email-templates/copy-sources", { params });
  },
  get(id) {
    return apiClient.get(`/email-templates/${id}`);
  },
  create(data) {
    return apiClient.post("/email-templates", data);
  },
  update(id, data) {
    return apiClient.put(`/email-templates/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/email-templates/${id}`);
  },
};
