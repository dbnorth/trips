import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/worker-roles", { params });
  },
  get(id) {
    return apiClient.get(`/worker-roles/${id}`);
  },
  create(data) {
    return apiClient.post("/worker-roles", data);
  },
  update(id, data) {
    return apiClient.put(`/worker-roles/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/worker-roles/${id}`);
  },
};
