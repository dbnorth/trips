import axios from "axios";

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
  donate(data) {
    return publicClient.post("/public/donations", data);
  },
};
