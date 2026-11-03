import apiClient from "./services.js";

export default {
  getAll(tripId) {
    return apiClient.get("/trip-people-roles", { params: { tripId } });
  },
  get(id) {
    return apiClient.get(`/trip-people-roles/${id}`);
  },
  create(data) {
    return apiClient.post("/trip-people-roles", data);
  },
  update(id, data) {
    return apiClient.put(`/trip-people-roles/${id}`, data);
  },
  cancel(id) {
    return apiClient.post(`/trip-people-roles/${id}/cancel`);
  },
  uncancel(id) {
    return apiClient.post(`/trip-people-roles/${id}/uncancel`);
  },
  delete(id) {
    return apiClient.delete(`/trip-people-roles/${id}`);
  },
  documentReview(id) {
    return apiClient.get(`/trip-people-roles/${id}/document-review`);
  },
  setDocumentReviewed(id, documentId, reviewed) {
    return apiClient.put(`/trip-people-roles/${id}/documents/${documentId}/reviewed`, { reviewed });
  },
  viewDocument(id, documentId) {
    return apiClient.get(`/trip-people-roles/${id}/documents/${documentId}/view`, { responseType: "blob" });
  },
  viewSpecialization(id, documentId, specializationId) {
    return apiClient.get(
      `/trip-people-roles/${id}/documents/${documentId}/specializations/${specializationId}/view`,
      { responseType: "blob" }
    );
  },
};
