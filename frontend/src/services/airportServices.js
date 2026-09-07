import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/airports");
  },
  create(data) {
    return apiClient.post("/airports", data);
  },
  update(id, data) {
    return apiClient.put(`/airports/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/airports/${id}`);
  },
};
