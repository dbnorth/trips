<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import { storeAuthenticatedUser } from "../utils/authSession.js";

const route = useRoute();
const router = useRouter();

const form = ref({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
});
const formError = ref("");
const existingAccountEmail = ref("");
const saving = ref(false);

const applyContext = computed(() => ({
  tripId: route.query.tripId ? String(route.query.tripId) : "",
  orgId: route.query.orgId ? String(route.query.orgId) : "",
  org: route.query.org ? String(route.query.org) : "",
}));

const organizationName = computed(() => applyContext.value.org);

const signInRoute = computed(() => ({ name: "applyAuth", query: { ...route.query } }));

const goToApply = () => {
  const tripId = applyContext.value.tripId;
  if (tripId) router.push({ name: "tripBrowse", params: { tripId } });
  else router.push({ name: "home" });
};

const submit = () => {
  formError.value = "";
  existingAccountEmail.value = "";
  const f = form.value;
  if (!f.firstName || !f.lastName || !f.email || !f.password) {
    formError.value = "Please fill in all fields.";
    return;
  }
  if (f.password.length < 8) {
    formError.value = "Password must be at least 8 characters.";
    return;
  }
  if (f.password !== f.confirmPassword) {
    formError.value = "Passwords do not match.";
    return;
  }

  const orgId = applyContext.value.orgId ? Number(applyContext.value.orgId) : null;
  saving.value = true;
  AuthServices.registerUser({
    firstName: f.firstName,
    lastName: f.lastName,
    email: f.email,
    password: f.password,
    orgIds: orgId ? [orgId] : [],
  })
    .then((res) => {
      storeAuthenticatedUser(res.data, {
        orgId,
        orgName: organizationName.value || null,
        fromRegistration: true,
      });
      goToApply();
    })
    .catch((e) => {
      if (e.response?.status === 409) {
        existingAccountEmail.value = f.email;
        return;
      }
      formError.value = e.response?.data?.message || "Unable to create your account.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-container class="fill-height py-8" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="9" md="6" lg="5">
        <v-btn variant="text" class="mb-2 px-0" :to="signInRoute">← Back</v-btn>

        <v-card class="pa-4 pa-sm-6">
          <div class="mb-4">
            <h1 class="text-h5 font-weight-bold mb-1">Add a new account</h1>
            <div class="text-body-2 text-medium-emphasis">
              {{
                organizationName
                  ? `Create your account to apply with ${organizationName}.`
                  : "Create your account to apply for a trip."
              }}
            </div>
          </div>

          <v-alert v-if="existingAccountEmail" type="warning" class="mb-4">
            <div class="font-weight-medium mb-1">This email already has an account</div>
            <div class="text-body-2">
              An account already exists for <strong>{{ existingAccountEmail }}</strong>. Log in with
              that email instead of creating a new account.
            </div>
            <v-btn color="primary" variant="flat" size="small" class="mt-3" :to="signInRoute">
              Go to log in
            </v-btn>
          </v-alert>

          <v-form @submit.prevent="submit">
            <v-text-field
              v-model="form.firstName"
              label="First name"
              autocomplete="given-name"
              density="comfortable"
            />
            <v-text-field
              v-model="form.lastName"
              label="Last name"
              autocomplete="family-name"
              density="comfortable"
            />
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              autocomplete="email"
              density="comfortable"
            />
            <v-text-field
              v-model="form.password"
              label="Password"
              type="password"
              autocomplete="new-password"
              hint="At least 8 characters"
              density="comfortable"
            />
            <v-text-field
              v-model="form.confirmPassword"
              label="Confirm password"
              type="password"
              autocomplete="new-password"
              density="comfortable"
            />
            <v-alert v-if="formError" type="error" density="compact" class="mb-3">
              {{ formError }}
            </v-alert>
            <v-btn type="submit" color="primary" variant="flat" block size="large" :loading="saving">
              Create account
            </v-btn>
          </v-form>

          <div class="text-center mt-4 text-body-2">
            Already have an account?
            <router-link :to="signInRoute">Log in</router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
