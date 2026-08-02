<script setup>
import { computed } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import TripServices from "../services/tripServices.js";
import { countryName } from "../utils/locationData.js";

const props = defineProps({
  trip: { type: Object, default: null },
  showOrgWebsite: { type: Boolean, default: true },
});

const orgName = computed(() => props.trip?.organization?.name || "");
const orgLogoUrl = computed(() => OrganizationServices.getLogoUrl(props.trip?.organization?.logo));
const orgWebsiteUrl = computed(() => {
  if (!props.showOrgWebsite) return null;
  const url = props.trip?.organization?.websiteUrl?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
});
const tripImageUrl = computed(() => TripServices.getImageUrl(props.trip?.image));

const tripDates = computed(() => {
  const start = props.trip?.startDate;
  const end = props.trip?.endDate;
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
});
</script>

<template>
  <div>
    <div v-if="orgName || orgLogoUrl" class="d-flex align-center ga-3 mb-4">
      <v-avatar v-if="orgLogoUrl" size="48" rounded="0">
        <v-img :src="orgLogoUrl" :alt="orgName || 'Organization logo'" />
      </v-avatar>
      <div>
        <div v-if="orgName" class="text-h6">{{ orgName }}</div>
        <a
          v-if="orgWebsiteUrl"
          :href="orgWebsiteUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-body-2"
        >
          Visit {{ orgName || "organization" }} website
        </a>
      </div>
    </div>

    <v-card v-if="trip" class="pa-4 mb-4">
      <v-row align="start">
        <v-col cols="12" md="6">
          <div class="text-h5 mb-1">{{ trip.name }}</div>
          <div class="text-subtitle-1 text-medium-emphasis" :class="tripDates ? 'mb-1' : 'mb-3'">
            {{ trip.city }}{{ trip.city && trip.country ? ", " : "" }}{{ countryName(trip.country) }}
          </div>
          <div v-if="tripDates" class="text-subtitle-1 text-medium-emphasis mb-3">
            {{ tripDates }}
          </div>
          <div v-if="trip.description" class="text-body-1">{{ trip.description }}</div>
        </v-col>
        <v-col v-if="tripImageUrl" cols="12" md="6">
          <v-img
            :src="tripImageUrl"
            :alt="trip.name"
            max-height="320"
            cover
            class="rounded"
          />
        </v-col>
      </v-row>
    </v-card>
  </div>
</template>
