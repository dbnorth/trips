import apiClient from "./services.js";

export default {
  loginUser(data) {
    return apiClient.post("/login", data);
  },
  registerUser(data) {
    return apiClient.post("/register", data);
  },
  getRegisterOrganizations() {
    return apiClient.get("/register/organizations");
  },
  getRegisterOrganizationBySubdomain(subdomain) {
    return apiClient.get(`/register/organizations/by-subdomain/${encodeURIComponent(subdomain)}`);
  },
  logoutUser(user) {
    return apiClient.post("/logout", { token: user?.token });
  },
  changePassword(data) {
    return apiClient.post("/change-password", data);
  },
  forgotPassword(email) {
    return apiClient.post("/forgot-password", { email });
  },
  resetPassword(token, newPassword) {
    return apiClient.post("/reset-password", { token, newPassword });
  },
  me() {
    return apiClient.get("/me");
  },
};
