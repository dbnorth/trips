import apiClient from "./services.js";

export default {
  lookupByEmail(email) {
    return apiClient.get("/donors/lookup", { params: { email } });
  },
  create(data) {
    return apiClient.post("/donors", data);
  },
  update(id, data) {
    return apiClient.put(`/donors/${id}`, data);
  },
};
