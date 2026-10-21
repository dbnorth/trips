<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";

const INVALID_LINK_MESSAGE = "This reset link is invalid or has expired. Please request a new one.";

const route = useRoute();
const router = useRouter();

const token = typeof route.query.token === "string" ? route.query.token : "";
const newPassword = ref("");
const confirmPassword = ref("");
const formError = ref("");
const linkInvalid = ref(!token);
const loading = ref(false);

const reset = () => {
  formError.value = "";
  if (newPassword.value.length < 8) {
    formError.value = "Password must be at least 8 characters.";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    formError.value = "Passwords do not match.";
    return;
  }
  loading.value = true;
  AuthServices.resetPassword(token, newPassword.value)
    .then(() => {
      router.push({ name: "login", query: { reset: "1" } });
    })
    .catch((e) => {
      const message = e.response?.data?.message || "Unable to reset the password.";
      if (message === INVALID_LINK_MESSAGE) linkInvalid.value = true;
      else formError.value = message;
    })
    .finally(() => {
      loading.value = false;
    });
};
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4">
          <v-card-title class="text-h5">Reset password</v-card-title>
          <v-card-text>
            <template v-if="linkInvalid">
              <v-alert type="error" density="compact" class="mb-4">{{ INVALID_LINK_MESSAGE }}</v-alert>
              <v-btn color="primary" block :to="{ name: 'forgotPassword' }">Request a new link</v-btn>
            </template>
            <v-form v-else @submit.prevent="reset">
              <v-text-field
                v-model="newPassword"
                label="New password"
                type="password"
                autocomplete="new-password"
                hint="At least 8 characters"
                persistent-hint
                class="mb-2"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                autocomplete="new-password"
              />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2">{{ formError }}</v-alert>
              <v-btn type="submit" color="primary" block :loading="loading">Reset password</v-btn>
            </v-form>
            <div class="text-center mt-4">
              <v-btn variant="text" size="small" :to="{ name: 'login' }">Back to sign in</v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
