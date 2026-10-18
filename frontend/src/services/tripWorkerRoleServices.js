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
  getReservations(id) {
    return apiClient.get(`/trip-worker-roles/${id}/reservations`);
  },
  addReservations(id, emails) {
    return apiClient.post(`/trip-worker-roles/${id}/reservations`, { emails });
  },
  deleteReservation(id, reservationId) {
    return apiClient.delete(`/trip-worker-roles/${id}/reservations/${reservationId}`);
  },
};
