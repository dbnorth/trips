<script setup>
import { ref } from "vue";
import { useRoute } from "vue-router";
import AuthServices from "../services/authServices.js";

const route = useRoute();

const email = ref(typeof route.query.email === "string" ? route.query.email : "");
const sentMessage = ref("");
const formError = ref("");
const loading = ref(false);

const send = () => {
  formError.value = "";
  if (!email.value.trim()) {
    formError.value = "Email is required.";
    return;
  }
  loading.value = true;
  AuthServices.forgotPassword(email.value.trim())
    .then((res) => {
      sentMessage.value = res.data?.message || "";
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Unable to send the reset link.";
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
          <v-card-title class="text-h5">Forgot password</v-card-title>
          <v-card-text>
            <v-alert v-if="sentMessage" type="info" density="compact" class="mb-4">{{ sentMessage }}</v-alert>
            <v-form v-else @submit.prevent="send">
              <p class="text-body-2 mb-4">Enter the email you sign in with and we will send you a link to reset your password.</p>
              <v-text-field v-model="email" label="Email" type="email" autocomplete="username" />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2">{{ formError }}</v-alert>
              <v-btn type="submit" color="primary" block :loading="loading">Send reset link</v-btn>
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
