import { ref } from "vue";
import PersonServices from "../services/personServices.js";

export function useTripLeaderPicker() {
  const leaderPeopleIds = ref([]);
  const leaderOptions = ref([]);
  const leadersLoading = ref(false);
  const leadersError = ref("");

  const personLabel = (person) => `${person.firstName || ""} ${person.lastName || ""}`.trim();

  const loadLeaderOptions = async (orgId) => {
    leadersError.value = "";
    if (!orgId) {
      leaderOptions.value = [];
      leaderPeopleIds.value = [];
      return;
    }

    leadersLoading.value = true;
    try {
      const res = await PersonServices.getOrgTripLeaders(orgId);
      leaderOptions.value = res.data || [];
      const validIds = new Set(leaderOptions.value.map((p) => Number(p.id)));
      leaderPeopleIds.value = leaderPeopleIds.value.filter((id) => validIds.has(Number(id)));
    } catch (e) {
      leadersError.value = e.response?.data?.message || "Unable to load trip leaders.";
      leaderOptions.value = [];
    } finally {
      leadersLoading.value = false;
    }
  };

  const setLeadersFromTrip = (ids) => {
    leaderPeopleIds.value = Array.isArray(ids) ? ids.map((id) => Number(id)) : [];
  };

  const resetLeaders = () => {
    leaderPeopleIds.value = [];
    leaderOptions.value = [];
    leadersError.value = "";
  };

  return {
    leaderPeopleIds,
    leaderOptions,
    leadersLoading,
    leadersError,
    personLabel,
    loadLeaderOptions,
    setLeadersFromTrip,
    resetLeaders,
  };
}
