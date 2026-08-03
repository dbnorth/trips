import apiClient from "./services.js";

export default {
  getAll(tripId) {
    return apiClient.get("/trip-worker-roles", { params: { tripId } });
  },
  create(data) {
    return apiClient.post("/trip-worker-roles", data);
  },
  update(id, data) {
    return apiClient.put(`/trip-worker-roles/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/trip-worker-roles/${id}`);
  },
};
