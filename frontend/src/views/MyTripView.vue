<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter } from "vue-router";
import TripServices from "../services/tripServices.js";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import ApplyTripDialog from "../components/ApplyTripDialog.vue";
import EditPersonDialog from "../components/EditPersonDialog.vue";
import ParticipantDonationsDialog from "../components/ParticipantDonationsDialog.vue";
import MakeDonationDialog from "../components/MakeDonationDialog.vue";
import FlightSegmentsDialog from "../components/FlightSegmentsDialog.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import MyTripNextActions from "../components/MyTripNextActions.vue";
import MyTripTravelDetails from "../components/MyTripTravelDetails.vue";
import { formatDateRange } from "../utils/dateFormat.js";
import { countryName } from "../utils/locationData.js";
import { hasApplicationAction } from "../utils/myTripNextActions.js";
import { donorParticipantPath } from "../utils/donateUrls.js";
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
const applicationStatus = ref(null);
const myTripInfo = ref(null);
const tripLeaders = ref([]);
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const showApplyDialog = ref(false);
const showDonationsDialog = ref(false);
const showDonateDialog = ref(false);
const showFlightsDialog = ref(false);
const showProfileDialog = ref(false);
const showConfirmCancelApp = ref(false);
const cancelAppSaving = ref(false);

const nextActions = computed(() => myTripInfo.value?.nextActions || []);

const FUNDING_ACTION_CODES = ["make-deposit", "make-donation"];
const shownNextActions = computed(() =>
  nextActions.value.filter((action) => !FUNDING_ACTION_CODES.includes(action.code))
);

const STATUS_PENDING = { type: "warning", color: "amber-lighten-4" };
const STATUS_APPROVED = { type: "success", color: "green-lighten-4" };
const STATUS_ENDED = { type: "error", color: "red-lighten-4" };

const statusMessage = computed(() => {
  switch (applicationStatus.value) {
    case "incomplete":
      return {
        ...STATUS_PENDING,
        text: "Application incomplete. Please update your application and profile as needed.",
      };
    case "pre_approved":
      return nextActions.value.some((action) => action.code === "upload-documents")
        ? {
            ...STATUS_PENDING,
            text: "You have been Pre-Approved and have a place on the trip, but you still need to complete your documents 90 days prior to the trip.",
          }
        : { ...STATUS_PENDING, text: "Your application and documents are complete and will be reviewed." };
    case "approved":
      return { ...STATUS_APPROVED, text: "Congratulations, you have been approved for the trip!" };
    case "declined":
      return { ...STATUS_ENDED, text: "Your application was not approved for this trip." };
    case "cancelled":
      return { ...STATUS_ENDED, text: "Your application has been cancelled." };
    default:
      return null;
  }
});

const canUpdateApplication = computed(
  () => applicationStatus.value === "incomplete" || applicationStatus.value === "pre_approved"
);

const showHeaderUpdateApp = computed(
  () => canUpdateApplication.value && !hasApplicationAction(nextActions.value)
);

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

const tripDates = computed(
  () => formatDateRange(trip.value?.startDate, trip.value?.endDate) || "—"
);

const tripPlace = computed(() =>
  [trip.value?.city, countryName(trip.value?.country)].filter(Boolean).join(", ")
);

const tripImageUrl = computed(() => TripServices.getImageUrl(trip.value?.image));

const onDonated = () => {
  messageType.value = "success";
  message.value = "Thank you for your donation!";
  load();
};

const load = async () => {
  loading.value = true;
  try {
    const res = await TripServices.getBrowseTrip(props.tripId);
    if (!res.data?.alreadyApplied) {
      router.replace({ name: "tripBrowse", params: { tripId: props.tripId } });
      return;
    }
    trip.value = res.data?.trip || null;
    applicationStatus.value = res.data?.applicationStatus || null;
    myTripInfo.value = res.data?.myTripInfo || null;
    tripLeaders.value = res.data?.tripLeaders || [];
  } catch (e) {
    messageType.value = "error";
    message.value = e.response?.data?.message || "Unable to load trip.";
    trip.value = null;
    applicationStatus.value = null;
    myTripInfo.value = null;
    tripLeaders.value = [];
  } finally {
    loading.value = false;
  }
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
  await refreshSession();
  load();
};

watch(showApplyDialog, (open) => {
  if (!open) load();
});

watch(showProfileDialog, (open) => {
  if (!open) load();
});

const confirmCancelApplication = async () => {
  cancelAppSaving.value = true;
  try {
    await TripServices.cancelApplication(props.tripId);
    showConfirmCancelApp.value = false;
    await load();
  } catch (e) {
    showConfirmCancelApp.value = false;
    messageType.value = "error";
    message.value = e.response?.data?.message || "Unable to cancel application.";
  } finally {
    cancelAppSaving.value = false;
  }
};

const fundraisingPath = computed(() =>
  ["pre_approved", "approved"].includes(myTripInfo.value?.status) &&
  trip.value?.status === "active" &&
  currentUser.value
    ? donorParticipantPath(trip.value, currentUser.value)
    : null
);

const copyFundraisingLink = async () => {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${fundraisingPath.value}`);
    messageType.value = "success";
    message.value = "Link copied.";
  } catch {
    messageType.value = "error";
    message.value = "Unable to copy link.";
  }
};

const participantName = computed(() =>
  [currentUser.value?.firstName, currentUser.value?.lastName].filter(Boolean).join(" ")
);

const downloadingArrivalPdf = ref(false);
const arrivalPdfError = ref("");

const downloadArrivalPdf = async () => {
  downloadingArrivalPdf.value = true;
  arrivalPdfError.value = "";
  try {
    await TripServices.downloadArrivalPdf(trip.value.id, `Trip Arrival - ${trip.value.name}.pdf`);
  } catch {
    arrivalPdfError.value = "Unable to download the Trip Arrival Document.";
  } finally {
    downloadingArrivalPdf.value = false;
  }
};

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
    <v-alert
      v-if="statusMessage"
      :type="statusMessage.type"
      :color="statusMessage.color"
      density="compact"
      class="mb-4 text-black font-weight-bold"
      data-testid="my-trip-status-message"
    >
      {{ statusMessage.text }}
    </v-alert>
    <v-alert v-if="message" :type="messageType" density="compact" class="mb-4">{{ message }}</v-alert>

    <DonorTripHeading :trip="trip" :show-org-website="false" :show-trip-card="false" />

    <v-card v-if="trip" class="pa-4 mb-4" variant="outlined" data-testid="my-trip-trip-info">
      <h2 class="text-h6 mb-3">Trip Info</h2>

      <v-row align="start" class="mb-2">
        <v-col cols="12" md>
          <div class="text-h4 font-weight-bold mb-1" data-testid="my-trip-trip-name">{{ trip.name }}</div>
          <div v-if="tripPlace" class="text-subtitle-1 text-medium-emphasis mb-2">{{ tripPlace }}</div>
          <div v-if="trip.description" class="text-body-1">{{ trip.description }}</div>
        </v-col>
        <v-col v-if="tripImageUrl" cols="12" md="auto">
          <img :src="tripImageUrl" :alt="trip.name" class="my-trip__image rounded" />
        </v-col>
      </v-row>

      <v-row dense class="mb-4">
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Location</div>
          <div>{{ trip.location || "—" }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Dates</div>
          <div data-testid="my-trip-trip-dates">{{ tripDates }}</div>
        </v-col>
        <v-col cols="12" sm="6" md="4">
          <div class="text-caption text-medium-emphasis">Status</div>
          <div>{{ trip.status }}</div>
        </v-col>
      </v-row>

      <div v-if="myTripInfo?.hasArrivalPdf" class="mb-4" data-testid="my-trip-arrival-download">
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-download"
          :loading="downloadingArrivalPdf"
          @click="downloadArrivalPdf"
        >
          Download Trip Arrival Document
        </v-btn>
        <v-alert v-if="arrivalPdfError" type="error" density="compact" class="mt-2">{{ arrivalPdfError }}</v-alert>
      </div>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Trip Leaders</h3>
      <div v-if="!tripLeaders.length" data-testid="no-trip-leaders">No Trip Leader assigned</div>
      <div v-else class="d-flex flex-column ga-4">
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
    </v-card>

    <v-card v-if="myTripInfo" class="pa-4 mb-4" variant="outlined">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-3">
        <div class="d-flex align-baseline flex-wrap ga-2">
          <h2 class="text-h6 mb-0">My Trip Info</h2>
          <template v-if="fundraisingPath">
            <a :href="fundraisingPath" target="_blank" rel="noopener" class="text-body-1 ml-4">
              My fundraising page
            </a>
            <v-btn size="small" variant="text" @click="copyFundraisingLink">Copy link</v-btn>
          </template>
        </div>
        <div class="d-flex flex-wrap ga-2">
          <v-btn
            v-if="showHeaderUpdateApp"
            color="primary"
            variant="tonal"
            @click="openUpdateApplication"
          >
            Update App
          </v-btn>
        </div>
      </div>
      <MyTripNextActions
        v-if="shownNextActions.length"
        class="mb-3"
        :actions="shownNextActions"
        @update="openUpdateApplication"
        @cancel="showConfirmCancelApp = true"
        @flights="showFlightsDialog = true"
        @documents="showProfileDialog = true"
      />
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
      </v-row>
      <MyTripTravelDetails
        :info="myTripInfo"
        :trip="trip"
        :can-view-donations="canViewDonations"
        @edit-flights="showFlightsDialog = true"
        @view-donations="openDonations"
        @make-donation="showDonateDialog = true"
      />
    </v-card>

    <ApplyTripDialog
      v-model="showApplyDialog"
      :trip-id="tripId"
      @saved="onApplicationSaved"
    />
    <EditPersonDialog
      v-if="currentUser?.personId"
      v-model="showProfileDialog"
      :person-id="currentUser.personId"
    />
    <ParticipantDonationsDialog
      v-if="donationsParticipant"
      v-model="showDonationsDialog"
      :trip-id="tripId"
      :participant="donationsParticipant"
      read-only
    />
    <MakeDonationDialog
      v-if="currentUser?.personId"
      v-model="showDonateDialog"
      :trip-id="tripId"
      :person-id="currentUser.personId"
      @saved="onDonated"
    />
    <FlightSegmentsDialog
      v-if="myTripInfo?.tripPeopleRoleId"
      v-model="showFlightsDialog"
      :trip-id="tripId"
      :trip-people-role-id="myTripInfo.tripPeopleRoleId"
      :participant-name="participantName"
      :trip-start-date="trip?.startDate || ''"
      :trip-end-date="trip?.endDate || ''"
      @saved="load"
    />
    <ConfirmDialog
      v-model="showConfirmCancelApp"
      title="Are you sure?"
      message="Cancel this application? Your role slot will be freed."
      confirm-text="Cancel App"
      confirm-color="error"
      :loading="cancelAppSaving"
      @confirm="confirmCancelApplication"
    />
  </v-container>
</template>

<style scoped>
.my-trip__image {
  display: block;
  height: 7.5rem;
  width: auto;
  max-width: 100%;
  object-fit: cover;
}
</style>
