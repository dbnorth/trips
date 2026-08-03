<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import PersonServices from "../services/personServices.js";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import AddPersonDialog from "../components/AddPersonDialog.vue";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import Utils from "../config/utils.js";

const people = ref([]);
const trips = ref([]);
const message = ref("");
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editPersonId = ref(null);
const user = ref(null);
const loading = ref(false);

const filterName = ref("");
const filterTripId = ref(null);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));
const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const isAllOrgsView = computed(() => isSystemAdmin.value && !effectiveOrgId.value);
const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));
const resolvedOrgName = ref(null);
const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return resolvedOrgName.value || Utils.orgDisplayName(user.value, orgId);
});

const resolveOrgLabel = async () => {
  const orgId = effectiveOrgId.value;
  if (!orgId) {
    resolvedOrgName.value = null;
    return;
  }
  const cached = Utils.orgDisplayName(user.value, orgId);
  if (cached) {
    resolvedOrgName.value = cached;
    return;
  }
  try {
    const res = await OrganizationServices.get(orgId);
    resolvedOrgName.value = res.data?.name || null;
    if (res.data?.name) {
      const updated = {
        ...user.value,
        currentOrgId: Number(orgId),
        currentOrgName: res.data.name,
      };
      Utils.setStore("user", updated);
      user.value = updated;
    }
  } catch {
    resolvedOrgName.value = null;
  }
};
const canViewPeople = computed(() => !!effectiveOrgId.value || isAllOrgsView.value);
const canAddPerson = computed(() => !!effectiveOrgId.value);

const tripItems = computed(() => [
  { title: "All trips", value: null },
  ...trips.value.map((t) => ({ title: t.name, value: t.id })),
]);

const personDisplayName = (person) =>
  `${person.firstName || ""} ${person.lastName || ""}`.trim().toLowerCase();

const filteredPeople = computed(() => {
  const q = filterName.value.trim().toLowerCase();
  if (!q) return people.value;
  return people.value.filter((p) => personDisplayName(p).includes(q));
});

const loadTrips = () => {
  if (!canViewPeople.value) {
    trips.value = [];
    filterTripId.value = null;
    return Promise.resolve();
  }
  return TripServices.getAll().then((r) => {
    let list = r.data || [];
    if (effectiveOrgId.value && !isAllOrgsView.value) {
      list = list.filter((t) => Number(t.orgId) === Number(effectiveOrgId.value));
    }
    trips.value = list;
    if (filterTripId.value && !trips.value.some((t) => t.id === filterTripId.value)) {
      filterTripId.value = null;
    }
  });
};

const load = () => {
  user.value = Utils.getStore("user");
  if (!canViewPeople.value) {
    people.value = [];
    return Promise.resolve();
  }

  loading.value = true;
  const params = {};
  if (filterTripId.value) params.tripId = filterTripId.value;

  return PersonServices.getAll(params)
    .then((r) => {
      people.value = r.data || [];
    })
    .finally(() => {
      loading.value = false;
    });
};

const refresh = async () => {
  await loadTrips();
  await load();
};

const onPersonSaved = (result) => {
  message.value = result?.message || "Person added.";
  load();
};

const onPersonUpdated = () => {
  message.value = "Person updated.";
  load();
};

const openEdit = (person) => {
  editPersonId.value = person.id;
  showEditDialog.value = true;
};

watch(filterTripId, () => load());

const onUserUpdated = async () => {
  user.value = Utils.getStore("user");
  await resolveOrgLabel();
  await refresh();
};

watch(effectiveOrgId, () => resolveOrgLabel());

onMounted(() => {
  user.value = Utils.getStore("user");
  resolveOrgLabel().then(() => refresh());
  window.addEventListener("user-updated", onUserUpdated);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserUpdated);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">People</h1>
      <v-btn color="primary" :disabled="!canAddPerson" @click="showAddDialog = true">Add person</v-btn>
    </div>

    <v-alert v-if="showOrgScopeNotice && isAllOrgsView" type="info" variant="tonal" density="compact" class="mb-4">
      Showing people from all organizations. Select an organization in the menu bar to add a person or filter by one org.
    </v-alert>
    <v-alert v-else-if="showOrgScopeNotice && orgLabel" type="info" variant="tonal" density="compact" class="mb-4">
      Showing people for {{ orgLabel }}.
    </v-alert>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-row v-if="canViewPeople" class="mb-4">
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="filterName"
          label="Name"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-select
          v-model="filterTripId"
          :items="tripItems"
          label="Trip"
          density="compact"
          clearable
          hide-details
        />
      </v-col>
    </v-row>

    <v-data-table
      :items="filteredPeople"
      :loading="loading"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Email', key: 'email' },
        { title: 'City', key: 'city' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.name="{ item }">{{ item.firstName }} {{ item.lastName }}</template>
      <template #item.actions="{ item }">
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
      </template>
    </v-data-table>

    <AddPersonDialog v-model="showAddDialog" @saved="onPersonSaved" />
    <EditPersonDialog
      v-model="showEditDialog"
      :person-id="editPersonId"
      @saved="onPersonUpdated"
      @orgs-changed="load"
    />
  </v-container>
</template>
