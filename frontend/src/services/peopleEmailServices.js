import apiClient from "./services.js";

export default {
  getOptions() {
    return apiClient.get("/people-email/options");
  },
  getRecipients(data) {
    return apiClient.post("/people-email/recipients", data);
  },
  preview(data) {
    return apiClient.post("/people-email/preview", data);
  },
  send(data) {
    return apiClient.post("/people-email", data);
  },
};
