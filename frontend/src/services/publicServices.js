import axios from "axios";
import Utils from "../config/utils.js";

const baseurl = import.meta.env.DEV ? "http://localhost:3200/trips/" : "/trips/";

const publicClient = axios.create({ baseURL: baseurl });

export default {
  getTripBySlug(tripSlug) {
    return publicClient.get(`/public/trips/by-name/${encodeURIComponent(tripSlug)}`);
  },
  getParticipantBySlug(tripSlug, personSlug) {
    return publicClient.get(
      `/public/trips/by-name/${encodeURIComponent(tripSlug)}/participants/${encodeURIComponent(personSlug)}`
    );
  },
  getOrgBySlug(orgSlug) {
    return publicClient.get(`/public/orgs/by-name/${encodeURIComponent(orgSlug)}`);
  },
  getTripOverviewBySlug(tripSlug) {
    return publicClient.get(`/public/trips/by-name/${encodeURIComponent(tripSlug)}/overview`);
  },
  startCheckout(data) {
    const token = Utils.getStore("user")?.token;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return publicClient.post("/public/donations/stripe-checkout", data, { headers });
  },
  checkCheckout(token) {
    return publicClient.post(`/public/donations/stripe-checkout/${encodeURIComponent(token)}/check`);
  },
};
