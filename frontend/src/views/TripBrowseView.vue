<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import ParticipantDonationsDialog from "../components/ParticipantDonationsDialog.vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { storeAuthenticatedUser } from "../utils/authSession.js";
import {
  tripParticipantStatusLabel,
  tripParticipantStatusColor,
} from "../utils/tripParticipantStatus.js";

const props = defineProps({
  tripId: { type: [String, Number], required: true },
});

const router = useRouter();
const trip = ref(null);
const rolesNeeded = ref([]);
const alreadyApplied = ref(false);
const applicationStatus = ref(null);
const myTripInfo = ref(null);
const tripLeaders = ref([]);
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const showApplyDialog = ref(false);
const showDonationsDialog = ref(false);

const canUpdateApplication = computed(
  () =>
    alreadyApplied.value &&
    (applicationStatus.value === "incomplete" || applicationStatus.value === "applied")
);

const showApplyInvite = computed(() => !!trip.value && !alreadyApplied.value);

const tripOrgId = computed(() => trip.value?.orgId ?? trip.value?.organization?.id ?? null);

const currentUser = computed(() => Utils.getStore("user"));

const donationsParticipant = computed(() => {
  const user = currentUser.value;
  if (!user?.personId) return null;
  return {
    peopleId: user.personId,
    person: {
      id: user.personId,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    },
  };
});

const canViewDonations = computed(() => !!myTripInfo.value && !!donationsParticipant.value);

const load = async () => {
  loading.value = true;
  message.value = "";
  try {
    const res = await TripServices.getBrowseTrip(props.tripId);
    trip.value = res.data?.trip || null;
    rolesNeeded.value = res.data?.rolesNeeded || [];
    alreadyApplied.value = !!res.data?.alreadyApplied;
    applicationStatus.value = res.data?.applicationStatus || null;
    myTripInfo.value = res.data?.myTripInfo || null;
    tripLeaders.value = res.data?.tripLeaders || [];
  } catch (e) {
    messageType.value = "error";
    message.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    rolesNeeded.value = [];
    myTripInfo.value = null;
    tripLeaders.value = [];
  } finally {
    loading.value = false;
  }
};

const openApply = () => {
  if (alreadyApplied.value && !canUpdateApplication.value) return;
  showApplyDialog.value = true;
};

const openUpdateApplication = () => {
  if (!canUpdateApplication.value) return;
  showApplyDialog.value = true;
};

const openDonations = () => {
  if (!canViewDonations.value) return;
  showDonationsDialog.value = true;
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

const onApplicationSaved = async () => {
  messageType.value = "success";
  message.value = "Application submitted. Your organization will review it.";
  await refreshSession();
  load();
};

const leaderPictureUrl = (leader) => PersonServices.getPictureUrl(leader?.picture);

const leaderInitials = (leader) => {
  const first = leader?.firstName?.trim()?.[0] || "";
  const last = leader?.lastName?.trim()?.[0] || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  return (leader?.name || "L").slice(0, 2).toUpperCase();
};

onMounted(load);
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

    <DonorTripHeading :trip="trip" :show-org-website="false" />

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
      <v-alert v-if="!tripLeaders.length" type="info" density="compact" class="mb-4">
        No trip leaders have been assigned yet.
      </v-alert>
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
            <td>{{ row.availableCount ?? 0 }}</td>
          </tr>
        </tbody>
      </v-table>
      <p v-else class="text-body-2 text-medium-emphasis mb-0">
        No team roles have been listed for this trip yet.
      </p>
    </v-card>

    <v-card v-if="myTripInfo" class="pa-4 mb-4" variant="outlined">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <h2 class="text-h6 mb-0">My Trip Info</h2>
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            v-if="canViewDonations"
            color="primary"
            variant="tonal"
            @click="openDonations"
          >
            View donations
          </v-btn>
          <v-btn
            v-if="canUpdateApplication"
            color="primary"
            variant="tonal"
            @click="openUpdateApplication"
          >
            Update App
          </v-btn>
        </div>
      </div>
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Status</div>
          <v-chip
            size="small"
            variant="tonal"
            class="mt-1"
            :color="tripParticipantStatusColor(myTripInfo.status)"
          >
            {{ tripParticipantStatusLabel(myTripInfo.status) }}
          </v-chip>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Role</div>
          <div>{{ myTripInfo.workerRoleName || "—" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Your trip cost</div>
          <div>
            {{
              myTripInfo.participantCost != null
                ? formatMoneyDisplay(myTripInfo.participantCost)
                : "—"
            }}
          </div>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <div class="text-caption text-medium-emphasis">Donations so far</div>
          <div>{{ formatMoneyDisplay(myTripInfo.donationTotal || 0) }}</div>
        </v-col>
      </v-row>
    </v-card>

    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="tripId"
      @saved="onApplicationSaved"
    />
    <ParticipantDonationsDialog
      v-if="donationsParticipant"
      v-model="showDonationsDialog"
      :trip-id="tripId"
      :participant="donationsParticipant"
      read-only
    />
  </v-container>
</template>
