import apiClient from "./services.js";

export default {
  getAll(params = {}) {
    return apiClient.get("/medical-conditions", { params });
  },
  get(id) {
    return apiClient.get(`/medical-conditions/${id}`);
  },
  create(data) {
    return apiClient.post("/medical-conditions", data);
  },
  update(id, data) {
    return apiClient.put(`/medical-conditions/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/medical-conditions/${id}`);
  },
};
