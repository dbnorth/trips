import { computed, ref, watch } from "vue";
import PersonServices from "../services/personServices.js";

export function useTripLeaderPicker() {
  const leaderPeopleIds = ref([]);
  const primaryLeaderPeopleId = ref(null);
  const leaderOptions = ref([]);
  const leadersLoading = ref(false);
  const leadersError = ref("");

  const personLabel = (person) =>
    [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ").trim();

  const primaryLeaderItems = computed(() =>
    leaderPeopleIds.value.map((id) => {
      const person = leaderOptions.value.find((p) => Number(p.id) === Number(id));
      return { title: person ? personLabel(person) : `Person ${id}`, value: Number(id) };
    })
  );

  watch(
    leaderPeopleIds,
    (ids) => {
      const selected = (ids || []).map((id) => Number(id));
      if (!selected.length) {
        primaryLeaderPeopleId.value = null;
        return;
      }
      if (!selected.includes(Number(primaryLeaderPeopleId.value))) {
        primaryLeaderPeopleId.value = selected[0];
      }
    },
    { deep: true }
  );

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

  const setLeadersFromTrip = (ids, primaryId = null) => {
    const list = Array.isArray(ids) ? ids.map((id) => Number(id)) : [];
    primaryLeaderPeopleId.value =
      primaryId != null && list.includes(Number(primaryId)) ? Number(primaryId) : list[0] ?? null;
    leaderPeopleIds.value = list;
  };

  const resetLeaders = () => {
    leaderPeopleIds.value = [];
    primaryLeaderPeopleId.value = null;
    leaderOptions.value = [];
    leadersError.value = "";
  };

  return {
    leaderPeopleIds,
    primaryLeaderPeopleId,
    primaryLeaderItems,
    leaderOptions,
    leadersLoading,
    leadersError,
    personLabel,
    loadLeaderOptions,
    setLeadersFromTrip,
    resetLeaders,
  };
}
