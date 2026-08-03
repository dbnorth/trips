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
  logoutUser(user) {
    return apiClient.post("/logout", { token: user?.token });
  },
  changePassword(data) {
    return apiClient.post("/change-password", data);
  },
  me() {
    return apiClient.get("/me");
  },
};
