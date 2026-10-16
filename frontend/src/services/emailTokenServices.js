import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/email-tokens");
  },
  getValueSources() {
    return apiClient.get("/email-tokens/value-sources");
  },
  get(id) {
    return apiClient.get(`/email-tokens/${id}`);
  },
  create(data) {
    return apiClient.post("/email-tokens", data);
  },
  update(id, data) {
    return apiClient.put(`/email-tokens/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/email-tokens/${id}`);
  },
};
