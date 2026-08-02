import apiClient from "./services.js";

export default {
  getAll(tripId) {
    return apiClient.get("/trip-travel-options", { params: { tripId } });
  },
  create(data) {
    return apiClient.post("/trip-travel-options", data);
  },
  update(id, data) {
    return apiClient.put(`/trip-travel-options/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/trip-travel-options/${id}`);
  },
};
