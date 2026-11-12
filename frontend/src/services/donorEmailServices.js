import apiClient from "./services.js";

export default {
  getOptions() {
    return apiClient.get("/donor-email/options");
  },
  getRecipients(data) {
    return apiClient.post("/donor-email/recipients", data);
  },
  preview(data) {
    return apiClient.post("/donor-email/preview", data);
  },
  send(data) {
    return apiClient.post("/donor-email/send", data);
  },
};
