<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import PublicServices from "../services/publicServices.js";
import OrganizationServices from "../services/organizationServices.js";
import TripServices from "../services/tripServices.js";
import { toUrlSlug, donorTripPath, publicTripPath } from "../utils/donateUrls.js";
import { countryName } from "../utils/locationData.js";

const props = defineProps({
  orgSlug: { type: String, required: true },
});

const router = useRouter();
const loading = ref(false);
const message = ref("");
const organization = ref(null);
const trips = ref([]);

const orgLogoUrl = computed(() => OrganizationServices.getLogoUrl(organization.value?.logo));
const orgWebsiteUrl = computed(() => {
  const url = organization.value?.websiteUrl?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
});

const formatDates = (trip) => {
  const start = trip?.startDate;
  const end = trip?.endDate;
  if (!start && !end) return "—";
  if (start && end) return `${start} – ${end}`;
  return start || end;
};

const tripLocation = (trip) => {
  if (trip?.location) return trip.location;
  const city = trip?.city || "";
  const country = countryName(trip?.country) || "";
  if (city && country) return `${city}, ${country}`;
  return city || country || "—";
};

const tripImageUrl = (trip) => TripServices.getImageUrl(trip?.image);

const load = async () => {
  if (!props.orgSlug) return;
  loading.value = true;
  message.value = "";
  try {
    const res = await PublicServices.getOrgBySlug(props.orgSlug);
    organization.value = res.data?.organization || null;
    trips.value = res.data?.trips || [];
    const expectedSlug = toUrlSlug(organization.value?.name);
    if (expectedSlug && props.orgSlug !== expectedSlug) {
      router.replace({ name: "orgTrips", params: { orgSlug: expectedSlug } });
    }
  } catch (e) {
    organization.value = null;
    trips.value = [];
    message.value = e.response?.data?.message || "Unable to load organization.";
  } finally {
    loading.value = false;
  }
};

const openApply = (trip) => {
  if (!trip?.id) return;
  router.push({
    name: "applyAuth",
    query: {
      tripId: String(trip.id),
      trip: trip.name || undefined,
      orgId: organization.value?.id != null ? String(organization.value.id) : undefined,
      org: organization.value?.name || undefined,
      orgSlug: props.orgSlug,
    },
  });
};

watch(() => props.orgSlug, load);
onMounted(load);
</script>

<template>
  <v-container class="py-8">
    <v-progress-linear v-if="loading" indeterminate class="mb-6" />
    <v-alert v-if="message" type="error" density="compact" class="mb-4" closable @click:close="message = ''">
      {{ message }}
    </v-alert>

    <template v-if="organization">
      <div class="d-flex align-center ga-3 mb-8">
        <v-avatar v-if="orgLogoUrl" size="64" rounded="0">
          <v-img :src="orgLogoUrl" :alt="organization.name" />
        </v-avatar>
        <div>
          <h1 class="text-h4 mb-0">{{ organization.name }}</h1>
          <a
            v-if="orgWebsiteUrl"
            :href="orgWebsiteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-body-2"
          >
            Visit website
          </a>
        </div>
      </div>

      <h2 class="text-h6 font-weight-bold mb-4">Upcoming Trips</h2>

      <v-alert v-if="!trips.length" type="info" density="compact">
        There are no open trips for this organization right now.
      </v-alert>

      <v-row v-else>
        <v-col
          v-for="trip in trips"
          :key="trip.id"
          cols="12"
          sm="6"
          lg="4"
        >
          <v-card class="h-100 d-flex flex-column">
            <v-img
              v-if="tripImageUrl(trip)"
              :src="tripImageUrl(trip)"
              :alt="trip.name"
              height="160"
              cover
            />
            <v-card-title class="text-wrap">{{ trip.name }}</v-card-title>
            <v-card-subtitle class="text-wrap pb-0">
              {{ tripLocation(trip) }}
            </v-card-subtitle>
            <v-card-text class="flex-grow-1">
              <div class="text-body-2 text-medium-emphasis">{{ formatDates(trip) }}</div>
            </v-card-text>
            <v-card-actions class="px-4 pb-4 pt-0 flex-wrap ga-2">
              <v-btn variant="tonal" :to="publicTripPath(trip)">View</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                :to="donorTripPath(trip)"
              >
                Donate
              </v-btn>
              <v-btn
                variant="tonal"
                @click="openApply(trip)"
              >
                Apply
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>
