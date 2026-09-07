import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/airlines");
  },
  create(data) {
    return apiClient.post("/airlines", data);
  },
  update(id, data) {
    return apiClient.put(`/airlines/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/airlines/${id}`);
  },
};
