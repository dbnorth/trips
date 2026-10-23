import apiClient, { getBaseUrl } from "./services.js";

export default {
  getAll(orgId) {
    return apiClient.get("/email-pictures", { params: { orgId } });
  },
  upload(orgId, file, name) {
    const formData = new FormData();
    formData.append("orgId", orgId);
    if (name) formData.append("name", name);
    formData.append("file", file);
    return apiClient.post("/email-pictures", formData);
  },
  rename(id, name) {
    return apiClient.put(`/email-pictures/${id}`, { name });
  },
  delete(id) {
    return apiClient.delete(`/email-pictures/${id}`);
  },
  fileUrl(picture) {
    return `${getBaseUrl()}${picture.url}`;
  },
};
