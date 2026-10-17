import apiClient from "./services.js";

export default {
  getAll(tripId, params = {}) {
    return apiClient.get("/donations", { params: { tripId, ...params } });
  },
  create(data) {
    return apiClient.post("/donations", data);
  },
  createByParticipant(data) {
    return apiClient.post("/donations/participant", data);
  },
  update(id, data) {
    return apiClient.put(`/donations/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/donations/${id}`);
  },
};
