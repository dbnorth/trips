import axios from "axios";
import Utils from "../config/utils.js";
import Router from "../router.js";

const baseurl = import.meta.env.DEV ? "http://localhost:3200/trips/" : "/trips/";

const apiClient = axios.create({
  baseURL: baseurl,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  transformResponse: (data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (parsed?.message?.includes("Unauthorized")) {
      Utils.removeItem("user");
      window.dispatchEvent(new CustomEvent("user-logged-out"));
      Router.push({ name: "login" });
    }
    return parsed;
  },
});

apiClient.interceptors.request.use((config) => {
  const user = Utils.getStore("user");
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  if (!config.skipOrgScope) {
    const orgId = Utils.effectiveOrgId(user);
    if (orgId != null && orgId !== "") {
      config.headers["X-Acting-Organization-Id"] = String(orgId);
    }
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (config.data && typeof config.data !== "string") {
    config.data = JSON.stringify(config.data);
  }
  return config;
});

export const getBaseUrl = () => baseurl;
export default apiClient;
