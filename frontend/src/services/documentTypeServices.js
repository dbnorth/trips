import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/document-types", { params });
  },
  get(id) {
    return apiClient.get(`/document-types/${id}`);
  },
  create(data) {
    return apiClient.post("/document-types", data);
  },
  update(id, data) {
    return apiClient.put(`/document-types/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/document-types/${id}`);
  },
};
