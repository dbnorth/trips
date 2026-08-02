import apiClient from "./services.js";

export default {
  org(orgId) {
    return apiClient.get("/dashboard/org", { params: { orgId } });
  },
  trip(tripId) {
    return apiClient.get("/dashboard/trip", { params: { tripId } });
  },
  participant(tripId) {
    return apiClient.get("/dashboard/participant", { params: { tripId } });
  },
};
