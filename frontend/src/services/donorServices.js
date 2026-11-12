import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("/donors");
  },
  lookupByEmail(email, tripId = null) {
    return apiClient.get("/donors/lookup", { params: { email, tripId } });
  },
  lookup(q, tripId = null) {
    return apiClient.get("/donors/lookup", { params: { q, tripId } });
  },
  create(data) {
    return apiClient.post("/donors", data);
  },
  update(id, data) {
    return apiClient.put(`/donors/${id}`, data);
  },
  importCsv(file) {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post("/donors/import", form);
  },
};
