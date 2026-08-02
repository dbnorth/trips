<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import { storeAuthenticatedUser } from "../utils/authSession.js";

const route = useRoute();
const router = useRouter();

const email = ref("");
const password = ref("");
const formError = ref("");
const loading = ref(false);

const applyContext = computed(() => ({
  tripId: route.query.tripId ? String(route.query.tripId) : "",
  orgId: route.query.orgId ? String(route.query.orgId) : "",
  org: route.query.org ? String(route.query.org) : "",
  orgSlug: route.query.orgSlug ? String(route.query.orgSlug) : "",
}));

const organizationName = computed(() => applyContext.value.org);
const tripName = computed(() => (route.query.trip ? String(route.query.trip) : ""));

const backRoute = computed(() => {
  const slug = applyContext.value.orgSlug;
  if (!slug) return null;
  return { name: "orgTrips", params: { orgSlug: slug } };
});

const goToCreateAccount = () => {
  router.push({ name: "applyCreateAccount", query: { ...route.query } });
};

const goToApply = () => {
  const tripId = applyContext.value.tripId;
  if (tripId) router.push({ name: "tripBrowse", params: { tripId } });
  else router.push({ name: "home" });
};

const login = () => {
  formError.value = "";
  if (!email.value || !password.value) {
    formError.value = "Enter your email and password.";
    return;
  }
  loading.value = true;
  AuthServices.loginUser({ email: email.value, password: password.value })
    .then((res) => {
      storeAuthenticatedUser(res.data, {
        orgId: applyContext.value.orgId || null,
        orgName: organizationName.value || null,
      });
      goToApply();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Login failed.";
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>

<template>
  <v-container class="fill-height py-8" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="9" md="6" lg="5">
        <v-btn v-if="backRoute" variant="text" class="mb-2 px-0" :to="backRoute">
          ← Back to trips
        </v-btn>

        <v-card class="pa-4 pa-sm-6">
          <div class="text-center mb-6">
            <h1 class="text-h5 font-weight-bold mb-1">
              {{ organizationName ? `Apply with ${organizationName}` : "Apply for a trip" }}
            </h1>
            <div v-if="tripName" class="text-body-2 text-medium-emphasis">{{ tripName }}</div>
          </div>

          <v-btn
            color="primary"
            variant="flat"
            size="x-large"
            block
            class="text-wrap py-4"
            @click="goToCreateAccount"
          >
            Add a new account if you don't have one
          </v-btn>

          <div class="d-flex align-center my-6">
            <v-divider />
            <span class="mx-4 text-overline text-medium-emphasis">or</span>
            <v-divider />
          </div>

          <h2 class="text-subtitle-1 font-weight-bold mb-3">Log in to your account</h2>
          <v-form @submit.prevent="login">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              autocomplete="username"
              density="comfortable"
            />
            <v-text-field
              v-model="password"
              label="Password"
              type="password"
              autocomplete="current-password"
              density="comfortable"
            />
            <v-alert v-if="formError" type="error" density="compact" class="mb-3">
              {{ formError }}
            </v-alert>
            <v-btn type="submit" color="primary" variant="tonal" block size="large" :loading="loading">
              Log in
            </v-btn>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
