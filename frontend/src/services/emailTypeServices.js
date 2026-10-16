import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/email-types");
  },
  get(id) {
    return apiClient.get(`/email-types/${id}`);
  },
  create(data) {
    return apiClient.post("/email-types", data);
  },
  update(id, data) {
    return apiClient.put(`/email-types/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/email-types/${id}`);
  },
};
