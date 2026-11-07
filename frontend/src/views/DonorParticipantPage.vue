<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import PublicServices from "../services/publicServices.js";
import PersonServices from "../services/personServices.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import StripePaymentMethod from "../components/StripePaymentMethod.vue";
import { toUrlSlug, personUrlSlug } from "../utils/donateUrls.js";
import { ONLINE_DONATIONS_NOT_SET_UP, goToStripe } from "../utils/stripeDonations.js";

const props = defineProps({
  tripSlug: { type: String, required: true },
  personSlug: { type: String, required: true },
});

const router = useRouter();
const trip = ref(null);
const participant = ref(null);
const whygoText = ref("");
const donationTotal = ref(0);
const onlineDonations = ref(false);
const message = ref("");
const donor = ref({ firstName: "", lastName: "", email: "" });
const amount = ref("");
const paymentMethod = ref("card");
const paying = ref(false);

const participantName = computed(() =>
  participant.value
    ? [participant.value.firstName, participant.value.middleName, participant.value.lastName]
        .filter(Boolean)
        .join(" ")
        .trim()
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
      onlineDonations.value = !!participantRes.data.onlineDonations;

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

const payWithStripe = () => {
  message.value = "";
  paying.value = true;
  PublicServices.startCheckout({
    tripId: trip.value?.id,
    personId: participant.value?.id,
    amount: Number(amount.value),
    paymentMethod: paymentMethod.value,
    donor: donor.value,
    returnPath: router.currentRoute.value.fullPath,
  })
    .then((r) => goToStripe(r.data.checkoutUrl))
    .catch((e) => {
      message.value = e.response?.data?.message || "Donation failed.";
      paying.value = false;
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

    <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>

    <div class="donation-form-wrap">
      <v-card class="pa-4">
        <v-card-title>Support {{ participant?.firstName }}</v-card-title>
        <v-text-field v-model="donor.firstName" label="Your first name" density="compact" />
        <v-text-field v-model="donor.lastName" label="Your last name" density="compact" />
        <v-text-field v-model="donor.email" label="Email" density="compact" />
        <v-text-field v-model="amount" label="Amount" type="number" density="compact" />
        <template v-if="onlineDonations">
          <StripePaymentMethod v-model="paymentMethod" />
          <v-btn color="primary" :disabled="!participant || !trip" :loading="paying" @click="payWithStripe">
            Pay with Stripe
          </v-btn>
        </template>
        <v-alert v-else-if="participant" type="info" density="compact" data-testid="online-donations-not-set-up">
          {{ ONLINE_DONATIONS_NOT_SET_UP }}
        </v-alert>
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
