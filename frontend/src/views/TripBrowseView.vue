<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { noSpotMessage } from "../utils/roleAvailability.js";
import { storeAuthenticatedUser } from "../utils/authSession.js";

const props = defineProps({
  tripId: { type: [String, Number], required: true },
});

const router = useRouter();
const trip = ref(null);
const rolesNeeded = ref([]);
const myReservedTripWorkerRoleId = ref(null);
const tripLeaders = ref([]);
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const showApplyDialog = ref(false);

const noSpot = computed(() =>
  noSpotMessage({
    rolesNeeded: rolesNeeded.value,
    myReservedTripWorkerRoleId: myReservedTripWorkerRoleId.value,
    alreadyApplied: false,
  })
);
const showNoSpotDialog = ref(false);
let noSpotShown = false;

const showApplyInvite = computed(() => !!trip.value && !noSpot.value);

const tripOrgId = computed(() => trip.value?.orgId ?? trip.value?.organization?.id ?? null);

const load = async () => {
  loading.value = true;
  message.value = "";
  try {
    const res = await TripServices.getBrowseTrip(props.tripId);
    if (res.data?.alreadyApplied) {
      router.replace({ name: "myTrip", params: { tripId: props.tripId } });
      return;
    }
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    myReservedTripWorkerRoleId.value = res.data?.myReservedTripWorkerRoleId ?? null;
    tripLeaders.value = res.data?.tripLeaders || [];
    if (noSpot.value && !noSpotShown) {
      showNoSpotDialog.value = true;
      noSpotShown = true;
    }
  } catch (e) {
    messageType.value = "error";
    message.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    rolesNeeded.value = [];
    tripLeaders.value = [];
  } finally {
    loading.value = false;
  }
};

const openApply = () => {
  showApplyDialog.value = true;
};

// Applying can add an organization role, so pull a fresh session and make that org active.
const refreshSession = async () => {
  if (!tripOrgId.value) return;
  try {
    const res = await AuthServices.me();
    storeAuthenticatedUser(res.data, {
      orgId: tripOrgId.value,
      orgName: trip.value?.organization?.name || null,
    });
  } catch (e) {
    // The stored session still works; the new role shows up on the next sign in.
  }
};

const onApplicationSaved = () => {
  refreshSession();
};

watch(showApplyDialog, (open) => {
  if (!open) load();
});

const leaderPictureUrl = (leader) => PersonServices.getPictureUrl(leader?.picture);

const leaderInitials = (leader) => {
  const first = leader?.firstName?.trim()?.[0] || "";
  const last = leader?.lastName?.trim()?.[0] || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return (leader?.name || "L").slice(0, 2).toUpperCase();
};

onMounted(() => {
  load();
  window.addEventListener("user-updated", load);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", load);
});
</script>

<template>
  <v-container>
    <div class="mb-4">
      <v-btn variant="text" class="px-0" @click="router.push({ name: 'home' })">
        Back to dashboard
      </v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="message" :type="messageType" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-card v-if="showApplyInvite" class="pa-4 pa-sm-6 mb-4" color="primary" variant="tonal">
      <h2 class="text-h6 font-weight-bold mb-1">
        Thanks for your interest in applying for {{ trip.name }}!
      </h2>
      <p class="text-body-2 mb-4">
        Look over the trip details below, then start your application. You can save an incomplete
        application and finish it later.
      </p>
      <v-btn color="primary" variant="flat" size="large" @click="openApply">
        Apply for this trip
      </v-btn>
    </v-card>

    <v-card v-if="trip" class="pa-4 mb-4" variant="outlined">
      <h2 class="text-h6 mb-3">Trip Info</h2>

      <v-row dense class="mb-4">
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Location</div>
          <div>{{ trip.location || "—" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Participant cost</div>
          <div>
            {{ trip.participantCost != null ? formatMoneyDisplay(trip.participantCost) : "—" }}
          </div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Status</div>
          <div>{{ trip.status }}</div>
        </v-col>
      </v-row>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Trip Leaders</h3>
      <div v-if="!tripLeaders.length" class="mb-4" data-testid="no-trip-leaders">No Trip Leader assigned</div>
      <div v-else class="d-flex flex-column ga-4 mb-4">
        <div
          v-for="leader in tripLeaders"
          :key="leader.id"
          class="d-flex align-center ga-3"
        >
          <v-avatar size="56" rounded="lg" color="primary">
            <v-img
              v-if="leaderPictureUrl(leader)"
              :src="leaderPictureUrl(leader)"
              :alt="leader.name"
              cover
            />
            <span v-else class="text-body-2 font-weight-medium">{{ leaderInitials(leader) }}</span>
          </v-avatar>
          <div>
            <div class="font-weight-medium">{{ leader.name }}</div>
            <a
              v-if="leader.email"
              :href="`mailto:${leader.email}`"
              class="text-body-2"
            >
              {{ leader.email }}
            </a>
            <div v-else class="text-body-2 text-medium-emphasis">No email on file</div>
          </div>
        </div>
      </div>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Team roles needed</h3>
      <v-table v-if="rolesNeeded.length" density="compact">
        <thead>
          <tr>
            <th>Role</th>
            <th>Number Needed</th>
            <th>Positions Filled</th>
            <th>Reserved</th>
            <th>Available</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rolesNeeded" :key="row.id">
            <td>
              <div>{{ row.workerRole?.name || "—" }}</div>
              <div v-if="row.workerRole?.description" class="text-caption text-medium-emphasis">
                {{ row.workerRole.description }}
              </div>
            </td>
            <td>{{ row.quantity ?? 0 }}</td>
            <td>{{ row.signedUpCount ?? 0 }}</td>
            <td>{{ row.reservedCount ?? 0 }}</td>
            <td>{{ row.availableCount ?? 0 }}</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-body-2 text-medium-emphasis mb-0">
        No team roles have been listed for this trip yet.
      </p>
    </v-card>

    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="tripId"
      @saved="onApplicationSaved"
    />
    <v-dialog v-model="showNoSpotDialog" max-width="420">
      <v-card class="pa-2" data-testid="no-spot-dialog">
        <v-card-text>{{ noSpot }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" @click="showNoSpotDialog = false">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
