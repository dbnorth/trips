<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import PublicServices from "../services/publicServices.js";
import PersonServices from "../services/personServices.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import { toUrlSlug, personUrlSlug } from "../utils/donateUrls.js";

const props = defineProps({
  tripSlug: { type: String, required: true },
  personSlug: { type: String, required: true },
});

const router = useRouter();
const trip = ref(null);
const participant = ref(null);
const whygoText = ref("");
const donationTotal = ref(0);
const message = ref("");
const success = ref(false);
const donor = ref({ firstName: "", lastName: "", email: "" });
const amount = ref("");

const participantName = computed(() =>
  participant.value
    ? `${participant.value.firstName || ""} ${participant.value.lastName || ""}`.trim()
    : ""
);

const participantPictureUrl = computed(() =>
  PersonServices.getPictureUrl(participant.value?.picture)
);

const load = () => {
  message.value = "";
  Promise.all([
    PublicServices.getTripBySlug(props.tripSlug),
    PublicServices.getParticipantBySlug(props.tripSlug, props.personSlug),
  ])
    .then(([tripRes, participantRes]) => {
      trip.value = tripRes.data.trip;
      participant.value = participantRes.data.participant;
      whygoText.value = participantRes.data.whygoText;
      donationTotal.value = participantRes.data.donationTotal;

      const expectedTripSlug = toUrlSlug(trip.value?.name);
      const expectedPersonSlug = personUrlSlug(participant.value);
      if (
        expectedTripSlug &&
        expectedPersonSlug &&
        (props.tripSlug !== expectedTripSlug || props.personSlug !== expectedPersonSlug)
      ) {
        router.replace({
          name: "donorParticipant",
          params: {
            tripSlug: expectedTripSlug,
            personSlug: expectedPersonSlug,
          },
        });
      }
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load page.";
    });
};

const donate = () => {
  PublicServices.donate({
    tripId: trip.value?.id,
    personId: participant.value?.id,
    amount: Number(amount.value),
    donor: donor.value,
  })
    .then(() => {
      success.value = true;
      message.value = "Thank you for supporting this participant!";
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Donation failed.";
    });
};

onMounted(load);
watch(() => [props.tripSlug, props.personSlug], load);
</script>

<template>
  <v-container>
    <DonorTripHeading :trip="trip" />

    <v-card v-if="participant" class="pa-4 mb-4">
      <v-row align="start">
        <v-col v-if="participantPictureUrl" cols="12" sm="4" md="3">
          <v-img
            :src="participantPictureUrl"
            :alt="participantName"
            max-height="280"
            cover
            class="rounded"
          />
        </v-col>
        <v-col cols="12" :sm="participantPictureUrl ? 8 : 12" :md="participantPictureUrl ? 9 : 12">
          <div class="text-h5 mb-1">{{ participantName }}</div>
          <div v-if="whygoText" class="text-body-1 mb-3">{{ whygoText }}</div>
          <div v-if="participant.bioText" class="text-body-1 mb-3">{{ participant.bioText }}</div>
          <div class="text-subtitle-1 text-medium-emphasis">
            Raised so far: ${{ Number(donationTotal).toFixed(2) }}
          </div>
        </v-col>
      </v-row>
    </v-card>

    <v-alert v-if="message" :type="success ? 'success' : 'error'" class="mb-4">{{ message }}</v-alert>

    <div v-if="!success" class="donation-form-wrap">
      <v-card class="pa-4">
        <v-card-title>Support {{ participant?.firstName }}</v-card-title>
        <v-text-field v-model="donor.firstName" label="Your first name" density="compact" />
        <v-text-field v-model="donor.lastName" label="Your last name" density="compact" />
        <v-text-field v-model="donor.email" label="Email" density="compact" />
        <v-text-field v-model="amount" label="Amount" type="number" density="compact" />
        <v-btn color="primary" :disabled="!participant || !trip" @click="donate">Donate</v-btn>
      </v-card>
    </div>
  </v-container>
</template>

<style scoped>
.donation-form-wrap {
  max-width: 50%;
  min-width: 280px;
  margin-left: auto;
  margin-right: auto;
}
</style>
