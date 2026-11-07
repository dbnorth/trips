import apiClient from "./services.js";

export default {
  getAll(tripId, params = {}) {
    return apiClient.get("/donations", { params: { tripId, ...params } });
  },
  create(data) {
    return apiClient.post("/donations", data);
  },
  startParticipantCheckout(data) {
    return apiClient.post("/donations/participant/stripe-checkout", data);
  },
  startStaffCheckout(data) {
    return apiClient.post("/donations/stripe-checkout", data);
  },
  update(id, data) {
    return apiClient.put(`/donations/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/donations/${id}`);
  },
};
