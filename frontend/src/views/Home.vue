<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import Utils from "../config/utils.js";
import DashboardServices from "../services/dashboardServices.js";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import ExportServices from "../services/exportServices.js";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import EditTripDialog from "../components/EditTripDialog.vue";
import EditOrganizationDialog from "../components/EditOrganizationDialog.vue";
import {
  isProfileComplete,
} from "../utils/personProfile.js";
import { tripParticipantStatusLabel, tripParticipantStatusColor } from "../utils/tripParticipantStatus.js";
import { orgPublicRoute } from "../utils/donateUrls.js";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const person = ref(null);
const profileLoading = ref(false);
const showProfileDialog = ref(false);
const showApplyDialog = ref(false);
const applyTripId = ref(null);
const showEditOrgTrip = ref(false);
const editOrgTripId = ref(null);
const showEditOrganization = ref(false);
const editOrganizationId = ref(null);
const summary = ref(null);
const leaderTrips = ref([]);
const loading = ref(false);
const selectedTripId = ref(null);
const resolvedOrgName = ref(null);

const browseOrgs = ref([]);
const browseOrgId = ref(null);
const browseTrips = ref([]);
const myTrips = ref([]);
const showAllMyTrips = ref(false);
const browseTripsLoading = ref(false);
const browseMessage = ref("");
const orgTrips = ref([]);
const orgTripsLoading = ref(false);
const showAllOrgTrips = ref(false);

const todayDateOnly = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isFutureOrCurrentStart = (trip) => {
  if (!trip?.startDate) return false;
  return String(trip.startDate) >= todayDateOnly();
};

const displayMyTrips = computed(() => {
  const list = myTrips.value || [];
  if (showAllMyTrips.value) return list;
  return list.filter(isFutureOrCurrentStart);
});

const availableTrips = computed(() =>
  (browseTrips.value || []).filter((trip) => !trip.alreadyApplied && isFutureOrCurrentStart(trip))
);

const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));

const isOrgAdmin = computed(() => Utils.isOrgAdmin(user.value, effectiveOrgId.value));

/** Non–system-admin users with Org Admin role (home dashboard hides count cards). */
const isOrgAdminUser = computed(
  () =>
    !!user.value &&
    !Utils.isSystemAdmin(user.value) &&
    (user.value.orgRoles || []).some((r) => r.roleName === "Org Admin")
);

const showOrgTripsSection = computed(
  () => isOrgAdmin.value && !!effectiveOrgId.value
);

const isActiveUnendedTrip = (trip) => {
  if (String(trip?.status || "").toLowerCase() !== "active") return false;
  if (!trip?.endDate) return true;
  return String(trip.endDate) >= todayDateOnly();
};

const displayOrgTrips = computed(() => {
  const list = [...(orgTrips.value || [])].sort((a, b) => {
    const aStart = String(a.startDate || "");
    const bStart = String(b.startDate || "");
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  if (showAllOrgTrips.value) return list;
  return list.filter(isActiveUnendedTrip);
});

const isTripLeaderUser = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Leader")
);

const isTripLeaderOnly = computed(() => {
  if (!user.value || user.value.isAdmin) return false;
  const hasOrgAdmin = (user.value.orgRoles || []).some((r) => r.roleName === "Org Admin");
  return isTripLeaderUser.value && !hasOrgAdmin;
});

const showOrgScopeNotice = computed(() => Utils.showOrgScopeNotice(user.value));

const orgLabel = computed(() => {
  const orgId = effectiveOrgId.value;
  if (!orgId) return null;
  return resolvedOrgName.value || Utils.orgDisplayName(user.value, orgId);
});

const orgPublicPageRoute = computed(() => {
  const name = orgLabel.value;
  if (!name) return null;
  return orgPublicRoute({ name });
});

const leaderTripIds = computed(
  () =>
    new Set(
      (user.value?.tripRoles || [])
        .filter((r) => r.roleName === "Trip Leader")
        .map((r) => Number(r.tripId))
    )
);

const displayLeaderTrips = computed(() => {
  let list = leaderTrips.value.filter((t) => leaderTripIds.value.has(Number(t.id)));
  if (effectiveOrgId.value) {
    list = list.filter((t) => Number(t.orgId) === Number(effectiveOrgId.value));
  }
  return list;
});

const tripOptions = computed(() => {
  let roles = user.value?.tripRoles || [];
  if (isTripLeaderUser.value) {
    roles = roles.filter((r) => r.roleName === "Trip Leader");
    if (effectiveOrgId.value) {
      roles = roles.filter((r) => Number(r.orgId) === Number(effectiveOrgId.value));
    }
  }
  return roles.map((t) => ({ title: t.tripName, value: t.tripId }));
});

const showProfileSection = computed(() => Utils.showParticipantOrPendingProfile(user.value));

// Any non-admin signed-in user can browse/apply to active trips.
const showTripBrowseSection = computed(() => Utils.canBrowseAndApplyToTrips(user.value));

const profileComplete = computed(() => isProfileComplete(person.value));

const browseOrgItems = computed(() =>
  browseOrgs.value.map((org) => ({ title: org.name, value: Number(org.id) }))
);

const defaultBrowseOrgId = () => {
  const orgIds = browseOrgs.value.map((o) => Number(o.id));
  if (!orgIds.length) return null;

  const preferred = Utils.effectiveOrgId(user.value);
  if (preferred != null && orgIds.includes(Number(preferred))) return Number(preferred);

  const roleOrgs = Utils.getRoleOrgs(user.value);
  if (roleOrgs.length && orgIds.includes(Number(roleOrgs[0].orgId))) {
    return Number(roleOrgs[0].orgId);
  }

  return orgIds[0];
};

const loadBrowseTrips = async () => {
  if (!showTripBrowseSection.value || !browseOrgId.value) {
    browseTrips.value = [];
    myTrips.value = [];
    return;
  }
  browseTripsLoading.value = true;
  browseMessage.value = "";
  try {
    const [browseRes, myRes] = await Promise.all([
      TripServices.getBrowseTrips(browseOrgId.value),
      TripServices.getMyBrowseTrips(browseOrgId.value),
    ]);
    browseTrips.value = browseRes.data || [];
    myTrips.value = myRes.data || [];
  } catch (e) {
    browseMessage.value = e.response?.data?.message || "Unable to load trips.";
    browseTrips.value = [];
    myTrips.value = [];
  } finally {
    browseTripsLoading.value = false;
  }
};

const loadBrowseOrgs = async () => {
  if (!showTripBrowseSection.value) {
    browseOrgs.value = [];
    browseOrgId.value = null;
    browseTrips.value = [];
    myTrips.value = [];
    return;
  }
  try {
    // Participants / pending users: only orgs they belong to.
    // Org admins: only orgs they administer.
    const adminOrgs = Utils.getOrgAdminOrgs(user.value);
    const membershipOrgs = adminOrgs.length ? adminOrgs : Utils.getRoleOrgs(user.value);
    browseOrgs.value = membershipOrgs.map((org) => ({
      id: Number(org.orgId),
      name: org.orgName,
    }));
    const nextOrgId = defaultBrowseOrgId();
    browseOrgId.value = nextOrgId;
    if (nextOrgId) await loadBrowseTrips();
    else {
      browseTrips.value = [];
      myTrips.value = [];
    }
  } catch {
    browseOrgs.value = [];
    browseOrgId.value = null;
    browseTrips.value = [];
    myTrips.value = [];
  }
};

const onBrowseOrgChange = () => {
  loadBrowseTrips();
};

const viewBrowseTrip = (trip) => {
  router.push({ name: "tripBrowse", params: { tripId: trip.id } });
};

const openApplyDialog = (trip) => {
  if (!trip?.id) return;
  if (trip.alreadyApplied && !canUpdateApplication(trip)) return;
  applyTripId.value = trip.id;
  showApplyDialog.value = true;
};

const canUpdateApplication = (trip) =>
  trip?.alreadyApplied &&
  (trip.applicationStatus === "incomplete" || trip.applicationStatus === "applied");

const openUpdateApplication = (trip) => {
  openApplyDialog(trip);
};

const onApplicationSaved = () => {
  browseMessage.value = "Application submitted. Your organization will review it.";
  loadBrowseTrips();
};

const loadProfile = async () => {
  if (!showProfileSection.value || !user.value?.personId) {
    person.value = null;
    return;
  }
  profileLoading.value = true;
  try {
    const res = await PersonServices.get(user.value.personId);
    person.value = res.data || null;
  } catch {
    person.value = null;
  } finally {
    profileLoading.value = false;
  }
};

const onProfileSaved = async () => {
  try {
    const res = await AuthServices.me();
    const stored = Utils.getStore("user");
    const updated = { ...stored, ...res.data };
    Utils.setStore("user", updated);
    user.value = updated;
  } catch {
    user.value = Utils.getStore("user");
  }
  await loadProfile();
};

const formatLeaders = (trip) => (trip.leaderNames || []).join(", ") || "—";

const formatDate = (value) => value || "—";

const openLeaderTrip = (trip) => {
  if (trip.orgId != null) {
    const orgName =
      trip.organization?.name || Utils.orgDisplayName(user.value, trip.orgId) || null;
    Utils.setCurrentOrg(trip.orgId, orgName);
  }
};

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
  } catch {
    resolvedOrgName.value = null;
  }
};

const openOrgTrip = (trip) => {
  router.push({ name: "tripView", params: { tripId: trip.id } });
};

const openEditOrgTrip = (trip) => {
  if (!trip?.id) return;
  editOrgTripId.value = trip.id;
  showEditOrgTrip.value = true;
};

const onOrgTripUpdated = () => {
  loadOrgTrips();
};

const openEditOrganization = (orgId = null) => {
  const id = orgId ?? effectiveOrgId.value;
  if (!id) return;
  editOrganizationId.value = id;
  showEditOrganization.value = true;
};

const onOrganizationUpdated = async () => {
  await resolveOrgLabel();
  window.dispatchEvent(new CustomEvent("organizations-updated"));
  loadOrgTrips();
};

const loadOrgTrips = async () => {
  if (!showOrgTripsSection.value) {
    orgTrips.value = [];
    return;
  }
  orgTripsLoading.value = true;
  try {
    const res = await TripServices.getAll();
    const orgId = Number(effectiveOrgId.value);
    orgTrips.value = (res.data || []).filter((t) => Number(t.orgId) === orgId);
  } catch {
    orgTrips.value = [];
  } finally {
    orgTripsLoading.value = false;
  }
};

const loadLeaderTrips = async () => {
  loading.value = true;
  summary.value = null;
  try {
    await resolveOrgLabel();
    const res = await TripServices.getAll();
    leaderTrips.value = res.data || [];
  } catch (e) {
    summary.value = { error: e.response?.data?.message || "Unable to load trips." };
    leaderTrips.value = [];
  } finally {
    loading.value = false;
  }
};

const loadDashboard = () => {
  if (isTripLeaderOnly.value) {
    loadLeaderTrips();
    return;
  }

  // Participant / pending home uses My Trips browse sections, not count cards.
  if (showProfileSection.value) {
    summary.value = null;
    loading.value = false;
    return;
  }

  loading.value = true;
  const orgId = effectiveOrgId.value;
  const tripId = selectedTripId.value;

  let req;
  if (isOrgAdminUser.value) {
    summary.value = null;
    loading.value = false;
    loadOrgTrips();
    return;
  }
  if (isOrgAdmin.value && orgId) {
    req = DashboardServices.org(orgId);
  } else if (tripId) {
    req = DashboardServices.trip(tripId);
  } else if (Utils.isSystemAdmin(user.value)) {
    summary.value = {
      message: "System admin dashboard. Use People and Organizations in the menu, or emulate an organization from the menu bar.",
    };
    loading.value = false;
    return;
  } else {
    summary.value = null;
    loading.value = false;
    return;
  }

  req
    .then((r) => {
      summary.value = r.data;
    })
    .catch((e) => {
      summary.value = { error: e.response?.data?.message || "Unable to load dashboard." };
    })
    .finally(() => {
      loading.value = false;
    });
};

const exportCsv = (type) => {
  const tripId = selectedTripId.value || summary.value?.trip?.id;
  if (!tripId) return;
  if (type === "participants") ExportServices.participantsCsv(tripId);
  if (type === "donors") ExportServices.donorsCsv(tripId);
  if (type === "donations") ExportServices.donationsCsv(tripId);
};

const syncSelectedTrip = () => {
  const options = tripOptions.value;
  if (!options.length) {
    selectedTripId.value = null;
    return;
  }
  if (!options.some((o) => Number(o.value) === Number(selectedTripId.value))) {
    selectedTripId.value = options[0].value;
  }
};

const onUserContextChange = () => {
  user.value = Utils.getStore("user");
  syncSelectedTrip();
  loadProfile();
  loadBrowseOrgs();
  loadDashboard();
  loadOrgTrips();
};

watch(effectiveOrgId, () => {
  if (!user.value) return;
  syncSelectedTrip();
  if (showTripBrowseSection.value && effectiveOrgId.value) {
    if (Number(browseOrgId.value) !== Number(effectiveOrgId.value)) {
      browseOrgId.value = Number(effectiveOrgId.value);
      loadBrowseTrips();
    }
  }
  loadDashboard();
  loadOrgTrips();
});

onMounted(() => {
  user.value = Utils.getStore("user");
  selectedTripId.value = user.value?.currentTripId || user.value?.tripRoles?.[0]?.tripId || null;
  syncSelectedTrip();
  loadProfile();
  loadBrowseOrgs();
  loadDashboard();
  loadOrgTrips();
  window.addEventListener("user-updated", onUserContextChange);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", onUserContextChange);
});
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-alert
          v-if="showProfileSection && !profileLoading && user?.personId && !profileComplete"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-6"
        >
          <div class="d-flex align-center justify-space-between flex-wrap ga-3">
            <span>Please update your profile to continue.</span>
            <v-btn color="primary" size="small" @click="showProfileDialog = true">
              Update profile
            </v-btn>
          </div>
        </v-alert>

        <v-alert
          v-else-if="showProfileSection && !profileLoading && !user?.personId"
          type="warning"
          density="compact"
          class="mb-6"
        >
          Your account is not linked to a person record yet. Please contact your organization.
        </v-alert>

        <v-progress-linear
          v-if="showProfileSection && profileLoading"
          indeterminate
          class="mb-6"
        />

        <div
          v-if="showOrgTripsSection && (orgLabel || effectiveOrgId)"
          class="mb-4"
        >
          <div class="d-flex align-center flex-wrap ga-2">
            <h1 class="text-h5 mb-0">{{ orgLabel || "Organization" }}</h1>
            <v-btn size="small" variant="tonal" @click="openEditOrganization()">Edit</v-btn>
          </div>
          <router-link
            v-if="orgPublicPageRoute"
            :to="orgPublicPageRoute"
            class="text-body-2 d-inline-block mt-1"
          >
            Organization trips page
          </router-link>
        </div>

        <v-card v-if="showTripBrowseSection" class="mb-6 pa-4">
          <h2 class="text-h6 mb-3">Trips</h2>
          <h3
            v-if="browseOrgItems.length === 1"
            class="text-subtitle-1 font-weight-bold mb-4"
          >
            {{ browseOrgItems[0].title }}
          </h3>
          <v-select
            v-else-if="browseOrgItems.length > 1"
            v-model="browseOrgId"
            :items="browseOrgItems"
            label="Organization"
            density="compact"
            class="mb-4"
            style="max-width: 400px"
            hide-details
            @update:model-value="onBrowseOrgChange"
          />

          <v-alert v-if="browseMessage" type="info" density="compact" class="mb-3">
            {{ browseMessage }}
          </v-alert>
          <v-progress-linear v-if="browseTripsLoading" indeterminate class="mb-3" />
          <v-alert
            v-else-if="!browseOrgItems.length"
            type="info"
            density="compact"
            class="mb-0"
          >
            No organizations are available to browse yet.
          </v-alert>

          <template v-else>
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
              <h3 class="text-subtitle-1 font-weight-bold mb-0">My Trips</h3>
              <v-checkbox
                v-model="showAllMyTrips"
                label="Show all my trips"
                density="compact"
                hide-details
                class="mt-0"
              />
            </div>
            <v-alert
              v-if="!displayMyTrips.length"
              type="info"
              density="compact"
              class="mb-4"
            >
              {{
                showAllMyTrips
                  ? "You are not on any trips for this organization."
                  : "You have no upcoming trips. Check “Show all my trips” to include past trips."
              }}
            </v-alert>
            <v-table v-else density="compact" class="trip-table mb-6">
              <colgroup>
                <col class="trip-table__name" />
                <col class="trip-table__location" />
                <col class="trip-table__date" />
                <col class="trip-table__date" />
                <col class="trip-table__status" />
                <col class="trip-table__actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in displayMyTrips" :key="`my-${item.id}`">
                  <td>{{ item.name }}</td>
                  <td>{{ item.location || "—" }}</td>
                  <td>{{ formatDate(item.startDate) }}</td>
                  <td>{{ formatDate(item.endDate) }}</td>
                  <td>
                    <v-chip
                      size="small"
                      variant="tonal"
                      :color="tripParticipantStatusColor(item.applicationStatus)"
                    >
                      {{ tripParticipantStatusLabel(item.applicationStatus) }}
                    </v-chip>
                  </td>
                  <td class="text-right">
                    <div class="d-flex justify-end ga-2 flex-wrap">
                      <v-btn size="small" variant="tonal" @click="viewBrowseTrip(item)">View</v-btn>
                      <v-btn
                        v-if="canUpdateApplication(item)"
                        size="small"
                        color="primary"
                        @click="openUpdateApplication(item)"
                      >
                        Update App
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <h3 class="text-subtitle-1 font-weight-bold mb-2">Trips you can apply for</h3>
            <v-alert
              v-if="!availableTrips.length"
              type="info"
              density="compact"
              class="mb-0"
            >
              No upcoming trips available to apply for in this organization.
            </v-alert>
            <v-table v-else density="compact" class="trip-table">
              <colgroup>
                <col class="trip-table__name" />
                <col class="trip-table__location" />
                <col class="trip-table__date" />
                <col class="trip-table__date" />
                <col class="trip-table__status" />
                <col class="trip-table__actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in availableTrips" :key="`avail-${item.id}`">
                  <td>{{ item.name }}</td>
                  <td>{{ item.location || "—" }}</td>
                  <td>{{ formatDate(item.startDate) }}</td>
                  <td>{{ formatDate(item.endDate) }}</td>
                  <td>—</td>
                  <td class="text-right">
                    <div class="d-flex justify-end ga-2 flex-wrap">
                      <v-btn size="small" variant="tonal" @click="viewBrowseTrip(item)">View</v-btn>
                      <v-btn size="small" color="primary" @click="openApplyDialog(item)">
                        Apply
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </template>
        </v-card>

        <v-card v-if="showOrgTripsSection" class="mb-6 pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
            <h2 class="text-h6 font-weight-bold mb-0">Organization Trips</h2>
            <v-checkbox
              v-model="showAllOrgTrips"
              label="Show all trips"
              density="compact"
              hide-details
              class="mt-0"
            />
          </div>

          <v-progress-linear v-if="orgTripsLoading" indeterminate class="mb-3" />
          <v-alert
            v-else-if="!displayOrgTrips.length"
            type="info"
            density="compact"
            class="mb-0"
          >
            {{
              showAllOrgTrips
                ? "No trips for this organization."
                : "No active trips that have not ended. Check “Show all trips” to include other trips."
            }}
          </v-alert>
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th class="text-right" style="min-width: 100px">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in displayOrgTrips" :key="`org-trip-${item.id}`">
                <td>{{ item.name }}</td>
                <td>{{ item.location || "—" }}</td>
                <td>{{ formatDate(item.startDate) }}</td>
                <td>{{ formatDate(item.endDate) }}</td>
                <td>{{ item.status || "—" }}</td>
                <td class="text-right">
                  <div class="d-flex justify-end ga-2 flex-wrap">
                    <v-btn size="small" variant="tonal" @click="openOrgTrip(item)">View</v-btn>
                    <v-btn size="small" variant="text" @click="openEditOrgTrip(item)">Edit</v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>

        <template v-if="isTripLeaderOnly">
          <v-alert
            v-if="showOrgScopeNotice && orgLabel"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Trips you lead in {{ orgLabel }}.
          </v-alert>
          <v-alert
            v-else-if="showOrgScopeNotice && !orgLabel && effectiveOrgId"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            Trips you lead in the selected organization.
          </v-alert>

          <v-progress-linear v-if="loading" indeterminate class="mb-4" />
          <v-alert v-else-if="summary?.error" type="error" class="mb-4">{{ summary.error }}</v-alert>
          <v-alert
            v-else-if="!loading && !displayLeaderTrips.length"
            type="info"
            class="mb-4"
          >
            No trips you lead{{ orgLabel ? ` in ${orgLabel}` : effectiveOrgId ? " in the selected organization" : "" }}.
          </v-alert>

          <v-data-table
            v-if="displayLeaderTrips.length"
            :items="displayLeaderTrips"
            :loading="loading"
            :headers="[
              { title: 'Name', key: 'name' },
              { title: 'Leaders', key: 'leaders' },
              { title: 'Start date', key: 'startDate' },
              { title: 'End date', key: 'endDate' },
              { title: 'Active members', key: 'activeParticipantCount' },
            ]"
            density="compact"
          >
            <template #item.name="{ item }">
              <router-link
                :to="{
                  name: 'tripPeople',
                  query: { tripId: item.id, orgId: item.orgId },
                }"
                @click="openLeaderTrip(item)"
              >
                {{ item.name }}
              </router-link>
            </template>
            <template #item.leaders="{ item }">{{ formatLeaders(item) }}</template>
            <template #item.startDate="{ item }">{{ formatDate(item.startDate) }}</template>
            <template #item.endDate="{ item }">{{ formatDate(item.endDate) }}</template>
            <template #item.activeParticipantCount="{ item }">{{ item.activeParticipantCount ?? 0 }}</template>
          </v-data-table>
        </template>

        <template v-else-if="!isOrgAdminUser && !showProfileSection">
          <v-select
            v-if="tripOptions.length > 1"
            v-model="selectedTripId"
            :items="tripOptions"
            label="Select trip"
            density="compact"
            class="mb-4"
            style="max-width: 400px"
            @update:model-value="loadDashboard"
          />
          <v-progress-linear v-if="loading" indeterminate class="mb-4" />
          <v-alert v-if="summary?.error" type="error">{{ summary.error }}</v-alert>
          <v-alert v-else-if="summary?.message" type="info">{{ summary.message }}</v-alert>
          <v-alert
            v-else-if="isTripLeaderUser && !isOrgAdmin && !tripOptions.length"
            type="info"
            class="mb-4"
          >
            No trips you lead in the selected organization.
          </v-alert>

          <v-row v-if="summary && !summary.error && !summary.message">
            <v-col v-if="summary.tripCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Trips</div><div class="text-h4">{{ summary.tripCount }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.activeTrips != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Active trips</div><div class="text-h4">{{ summary.activeTrips }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.peopleCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">People</div><div class="text-h4">{{ summary.peopleCount }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.donationTotal != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Donations total</div><div class="text-h4">${{ Number(summary.donationTotal).toFixed(2) }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.participants != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Participants</div><div class="text-h4">{{ summary.participants }}</div></v-card-text></v-card>
            </v-col>
            <v-col v-if="summary.donationCount != null" cols="12" md="3">
              <v-card><v-card-text><div class="text-caption">Donation count</div><div class="text-h4">{{ summary.donationCount }}</div></v-card-text></v-card>
            </v-col>
          </v-row>

          <div v-if="selectedTripId || summary?.trip?.id" class="mt-4">
            <v-btn class="mr-2" size="small" @click="exportCsv('participants')">Export participants CSV</v-btn>
            <v-btn class="mr-2" size="small" @click="exportCsv('donors')">Export donors CSV</v-btn>
            <v-btn size="small" @click="exportCsv('donations')">Export donations CSV</v-btn>
          </div>
        </template>
      </v-col>
    </v-row>

    <EditPersonDialog
      v-if="showProfileSection && user?.personId"
      v-model="showProfileDialog"
      :person-id="user.personId"
      @saved="onProfileSaved"
    />
    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="applyTripId"
      @saved="onApplicationSaved"
    />
    <EditTripDialog
      v-model="showEditOrgTrip"
      :trip-id="editOrgTripId"
      @saved="onOrgTripUpdated"
    />
    <EditOrganizationDialog
      v-model="showEditOrganization"
      :organization-id="editOrganizationId"
      @saved="onOrganizationUpdated"
    />
  </v-container>
</template>

<style scoped>
.trip-table :deep(table) {
  table-layout: fixed;
  width: 100%;
}

.trip-table__name {
  width: 24%;
}

.trip-table__location {
  width: 20%;
}

.trip-table__date {
  width: 12%;
}

.trip-table__status {
  width: 14%;
}

.trip-table__actions {
  width: 18%;
}
</style>
