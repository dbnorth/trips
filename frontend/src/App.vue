<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { useTheme } from "vuetify";
import MenuBar from "./components/MenuBar.vue";
import Utils from "./config/utils.js";
import OrganizationServices from "./services/organizationServices.js";
import { resolveOrgColor } from "./plugins/vuetify.js";

const theme = useTheme();
const route = useRoute();

const hideMenuBar = computed(() =>
  ["donorTrip", "donorParticipant", "orgTrips", "publicTrip", "login"].includes(route.name)
);

const orgScopeKey = () => {
  const user = Utils.getStore("user");
  if (!user) return "none";
  return String(Utils.effectiveOrgId(user) ?? "all");
};

const viewKey = ref(orgScopeKey());

const applyOrgColor = (colorFamily) => {
  const primary = resolveOrgColor(colorFamily);
  if (theme.themes.value.myCustomLightTheme) {
    theme.themes.value.myCustomLightTheme.colors.primary = primary;
  }
};

const fetchAndApplyOrgColor = () => {
  const user = Utils.getStore("user");
  const org = Utils.currentOrg(user);
  if (org?.colorFamily) {
    applyOrgColor(org.colorFamily);
    return;
  }
  const orgId = Utils.effectiveOrgId(user);
  if (orgId) {
    OrganizationServices.get(orgId)
      .then((r) => applyOrgColor(r.data?.colorFamily))
      .catch(() => applyOrgColor());
  } else {
    applyOrgColor();
  }
};

const handleUserContextChange = () => {
  viewKey.value = orgScopeKey();
  fetchAndApplyOrgColor();
};

onMounted(() => {
  fetchAndApplyOrgColor();
  window.addEventListener("user-updated", handleUserContextChange);
  window.addEventListener("user-logged-in", handleUserContextChange);
  window.addEventListener("user-logged-out", handleUserContextChange);
});
onUnmounted(() => {
  window.removeEventListener("user-updated", handleUserContextChange);
  window.removeEventListener("user-logged-in", handleUserContextChange);
  window.removeEventListener("user-logged-out", handleUserContextChange);
});
</script>

<template>
  <v-app>
    <MenuBar v-if="!hideMenuBar" />
    <v-main>
      <router-view :key="`${route.fullPath}:${viewKey}`" />
    </v-main>
  </v-app>
</template>
