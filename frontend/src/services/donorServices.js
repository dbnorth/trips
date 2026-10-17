import apiClient from "./services.js";

export default {
  lookupByEmail(email, tripId = null) {
    return apiClient.get("/donors/lookup", { params: { email, tripId } });
  },
  create(data) {
    return apiClient.post("/donors", data);
  },
  update(id, data) {
    return apiClient.put(`/donors/${id}`, data);
  },
};
