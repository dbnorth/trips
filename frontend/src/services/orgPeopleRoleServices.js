import apiClient from "./services.js";

export default {
  getAll(orgId) {
    return apiClient.get("/org-people-roles", { params: { orgId } });
  },
  getByPerson(peopleId) {
    return apiClient.get("/org-people-roles", { params: { peopleId } });
  },
  create(data) {
    return apiClient.post("/org-people-roles", data);
  },
  update(id, data) {
    return apiClient.put(`/org-people-roles/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`/org-people-roles/${id}`);
  },
};
