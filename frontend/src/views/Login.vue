<script setup>
import { ref, computed, onMounted } from "vue";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { useRouter, useRoute } from "vue-router";
import { getRegistrationHostSubdomain } from "../utils/hostSubdomain.js";

const router = useRouter();
const route = useRoute();
const mode = ref("login");

const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const firstName = ref("");
const middleName = ref("");
const lastName = ref("");
const selectedOrgIds = ref([]);
const organizations = ref([]);
const orgsLoading = ref(false);
const formError = ref("");
const loading = ref(false);
const hostSubdomain = ref(getRegistrationHostSubdomain());
const subdomainOrg = ref(null);
const subdomainResolving = ref(false);

const hideOrgPicker = computed(() => !!subdomainOrg.value);

const storeUserAndGoHome = (data, { fromRegistration = false } = {}) => {
  const scopeOrgs = Utils.getScopeOrgs(data);
  const activeOrg = scopeOrgs[0] || null;
  const user = {
    ...data,
    currentOrgId: activeOrg?.orgId ?? null,
    currentOrgName: activeOrg?.orgName ?? null,
    currentTripId: data.tripRoles?.[0]?.tripId ?? null,
    fromRegistration,
  };
  Utils.setStore("user", user);
  window.dispatchEvent(new CustomEvent("user-logged-in"));
  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "";
  if (redirect.startsWith("/") && !redirect.startsWith("//")) {
    router.push(redirect);
    return;
  }
  router.push({ name: "home" });
};

const login = () => {
  formError.value = "";
  loading.value = true;
  AuthServices.loginUser({ email: email.value, password: password.value })
    .then((res) => storeUserAndGoHome(res.data))
    .catch((e) => {
      formError.value = e.response?.data?.message || "Login failed.";
    })
    .finally(() => {
      loading.value = false;
    });
};

const register = () => {
  formError.value = "";
  if (password.value !== confirmPassword.value) {
    formError.value = "Passwords do not match.";
    return;
  }
  loading.value = true;
  const payload = {
    firstName: firstName.value,
    middleName: middleName.value?.trim() || null,
    lastName: lastName.value,
    email: email.value,
    password: password.value,
    orgIds: hideOrgPicker.value ? [] : selectedOrgIds.value,
  };
  if (hostSubdomain.value && subdomainOrg.value) {
    payload.subdomain = hostSubdomain.value;
  }
  AuthServices.registerUser(payload)
    .then((res) => storeUserAndGoHome(res.data, { fromRegistration: true }))
    .catch((e) => {
      formError.value = e.response?.data?.message || "Registration failed.";
      if (e.response?.status === 409) {
        mode.value = "login";
      }
    })
    .finally(() => {
      loading.value = false;
    });
};

const loadOrganizations = () => {
  orgsLoading.value = true;
  AuthServices.getRegisterOrganizations()
    .then((res) => {
      organizations.value = res.data || [];
    })
    .catch(() => {
      organizations.value = [];
    })
    .finally(() => {
      orgsLoading.value = false;
    });
};

const resolveHostSubdomain = async () => {
  subdomainOrg.value = null;
  if (!hostSubdomain.value) return;
  subdomainResolving.value = true;
  try {
    const res = await AuthServices.getRegisterOrganizationBySubdomain(hostSubdomain.value);
    subdomainOrg.value = res.data || null;
  } catch {
    subdomainOrg.value = null;
  } finally {
    subdomainResolving.value = false;
  }
};

const showRegister = async () => {
  mode.value = "register";
  formError.value = "";
  await resolveHostSubdomain();
  if (!hideOrgPicker.value) loadOrganizations();
};

const showLogin = () => {
  mode.value = "login";
  formError.value = "";
  confirmPassword.value = "";
  firstName.value = "";
  middleName.value = "";
  lastName.value = "";
  selectedOrgIds.value = [];
};

onMounted(() => {
  hostSubdomain.value = getRegistrationHostSubdomain();
});
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card class="pa-4">
          <v-card-title class="text-h5">
            {{ mode === "login" ? "Mission Trips" : "Create account" }}
          </v-card-title>
          <v-card-subtitle v-if="mode === 'register'" class="mb-2">
            <template v-if="subdomainOrg">
              Create a new account to join {{ subdomainOrg.name }} as a trip participant. If you already have
              an account, go back and sign in.
            </template>
            <template v-else>
              Create a new account and optionally join organizations as a trip participant. If you already have
              an account, go back and sign in.
            </template>
          </v-card-subtitle>
          <v-card-text>
            <template v-if="mode === 'login'">
              <v-text-field v-model="email" label="Email" type="email" autocomplete="username" />
              <v-text-field v-model="password" label="Password" type="password" autocomplete="current-password" />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2">{{ formError }}</v-alert>
              <v-btn color="primary" block :loading="loading" @click="login">Sign in</v-btn>
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" @click="showRegister">Add person / create account</v-btn>
              </div>
            </template>

            <template v-else>
              <v-text-field v-model="firstName" label="First name" autocomplete="given-name" />
              <v-text-field v-model="middleName" label="Middle name" autocomplete="additional-name" />
              <v-text-field v-model="lastName" label="Last name" autocomplete="family-name" />
              <v-text-field v-model="email" label="Email" type="email" autocomplete="email" />
              <v-text-field v-model="password" label="Password" type="password" autocomplete="new-password" />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                type="password"
                autocomplete="new-password"
              />
              <v-alert
                v-if="subdomainOrg"
                type="info"
                density="compact"
                variant="tonal"
                class="mt-2"
              >
                Joining {{ subdomainOrg.name }}
              </v-alert>
              <v-select
                v-else-if="!subdomainResolving"
                v-model="selectedOrgIds"
                :items="organizations"
                item-title="name"
                item-value="id"
                label="Organizations (optional)"
                hint="Join selected organizations as a Trip Participant"
                persistent-hint
                multiple
                chips
                closable-chips
                :loading="orgsLoading"
                density="compact"
                class="mt-2"
              />
              <v-alert v-if="formError" type="error" density="compact" class="mb-2 mt-2">{{ formError }}</v-alert>
              <v-btn color="primary" block :loading="loading" class="mt-2" @click="register">Create account</v-btn>
              <div class="text-center mt-4">
                <v-btn variant="text" size="small" @click="showLogin">Back to sign in</v-btn>
              </div>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
