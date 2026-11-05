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
  updateDocument(id, documentId, data) {
    const form = new FormData();
    form.append("documentTypeId", data.documentTypeId);
    if (data.countryIssued) form.append("countryIssued", data.countryIssued);
    if (data.documentNumber) form.append("documentNumber", data.documentNumber);
    if (data.issueDate) form.append("issueDate", data.issueDate);
    if (data.expirationDate) form.append("expirationDate", data.expirationDate);
    if (data.file) form.append("document", data.file);
    if (data.specializations) {
      form.append("specializations", JSON.stringify(data.specializations));
      for (const file of data.specializationFiles || []) {
        form.append("specializationFiles", file);
      }
    }
    return apiClient.put(`/trip-people-roles/${id}/documents/${documentId}`, form);
  },
  requestDocumentReload(id, documentId, note) {
    return apiClient.post(`/trip-people-roles/${id}/documents/${documentId}/reload-request`, { note });
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
