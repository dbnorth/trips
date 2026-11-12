<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import PublicServices from "../services/publicServices.js";
import DonorTripHeading from "../components/DonorTripHeading.vue";
import StripePaymentMethod from "../components/StripePaymentMethod.vue";
import { toUrlSlug, personUrlSlug } from "../utils/donateUrls.js";
import { ONLINE_DONATIONS_NOT_SET_UP, goToStripe } from "../utils/stripeDonations.js";

const props = defineProps({
  tripSlug: { type: String, required: true },
});

const router = useRouter();
const trip = ref(null);
const participants = ref([]);
const onlineDonations = ref(false);
const message = ref("");
const donor = ref({ firstName: "", lastName: "", email: "" });
const amount = ref("");
const paymentMethod = ref("card");
const selectedPersonId = ref(null);
const paying = ref(false);

const participantRoute = (row) => {
  if (!trip.value?.name || !row?.person) return undefined;
  return {
    name: "donorParticipant",
    params: {
      tripSlug: toUrlSlug(trip.value.name),
      personSlug: personUrlSlug(row.person),
    },
  };
};

const load = () => {
  PublicServices.getTripBySlug(props.tripSlug)
    .then((r) => {
      trip.value = r.data.trip;
      participants.value = r.data.participants || [];
      onlineDonations.value = !!r.data.onlineDonations;
      const expectedSlug = toUrlSlug(trip.value?.name);
      if (expectedSlug && props.tripSlug !== expectedSlug) {
        router.replace({ name: "donorTrip", params: { tripSlug: expectedSlug } });
      }
    })
    .catch((e) => {
      message.value = e.response?.data?.message || "Unable to load trip.";
    });
};

const payWithStripe = () => {
  message.value = "";
  paying.value = true;
  PublicServices.startCheckout({
    tripId: trip.value?.id,
    personId: selectedPersonId.value,
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
</script>

<template>
  <v-container>
    <DonorTripHeading :trip="trip" />

    <v-alert v-if="message" type="error" class="mb-4">{{ message }}</v-alert>

    <div class="donation-form-wrap">
      <v-card class="pa-4">
        <v-card-title>Make a donation</v-card-title>
        <v-select
          v-model="selectedPersonId"
          :items="participants"
          :item-title="(p) => `${p.person?.firstName} ${p.person?.lastName}`"
          :item-value="(p) => p.person?.id"
          label="Support a participant (optional)"
          clearable
          density="compact"
        />
        <v-text-field v-model="donor.firstName" label="Your first name" density="compact" />
        <v-text-field v-model="donor.lastName" label="Your last name" density="compact" />
        <v-text-field v-model="donor.email" label="Email" density="compact" />
        <v-text-field v-model="amount" label="Amount" type="number" density="compact" />
        <template v-if="onlineDonations">
          <StripePaymentMethod v-model="paymentMethod" />
          <v-btn color="primary" :disabled="!trip" :loading="paying" @click="payWithStripe">Pay with Stripe</v-btn>
        </template>
        <v-alert v-else-if="trip" type="info" density="compact" data-testid="online-donations-not-set-up">
          {{ ONLINE_DONATIONS_NOT_SET_UP }}
        </v-alert>
      </v-card>
    </div>

    <v-list v-if="participants.length && trip" class="mt-4">
      <v-list-subheader>Visit a trip participants page</v-list-subheader>
      <v-list-item
        v-for="p in participants"
        :key="p.person?.id"
        :to="participantRoute(p)"
        link
        :title="`${p.person?.firstName} ${p.person?.lastName}`"
      />
    </v-list>
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
