<script setup>
import { ref, computed, onMounted } from "vue";
import Utils from "../config/utils.js";
import AuthServices from "../services/authServices.js";
import OrganizationServices from "../services/organizationServices.js";
import EditPersonDialog from "./EditPersonDialog.vue";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const orgLogoUrl = ref(null);
const orgName = ref("Mission Trips");
const actingOrgItems = ref([]);
const userOrgItems = ref([]);
const showProfileDialog = ref(false);
const ALL_ORGS_VALUE = "";

const persistOrgName = (orgId, name) => {
  const stored = Utils.getStore("user");
  if (!stored || !orgId || !name) return;
  const updated = {
    ...stored,
    currentOrgId: Number(orgId),
    currentOrgName: name,
  };
  Utils.setStore("user", updated);
  user.value = updated;
};

const resetMenu = () => {
  user.value = Utils.getStore("user");
  const org = Utils.currentOrg(user.value);
  const orgId = Utils.effectiveOrgId(user.value);
  orgName.value = org?.orgName || (user.value?.isAdmin ? "Mission Trips Admin" : "Mission Trips");
  if (org?.logo) {
    orgLogoUrl.value = OrganizationServices.getLogoUrl(org.logo);
  } else if (user.value?.isAdmin && user.value.actingOrganizationId) {
    OrganizationServices.get(user.value.actingOrganizationId)
      .then((r) => {
        orgLogoUrl.value = OrganizationServices.getLogoUrl(r.data?.logo);
        orgName.value = r.data?.name || orgName.value;
        if (r.data?.name) {
          persistOrgName(user.value.actingOrganizationId, r.data.name);
        }
      })
      .catch(() => {});
  } else if (orgId && !org?.logo) {
    OrganizationServices.get(orgId)
      .then((r) => {
        orgLogoUrl.value = OrganizationServices.getLogoUrl(r.data?.logo);
        orgName.value = r.data?.name || orgName.value;
        if (r.data?.name) {
          persistOrgName(orgId, r.data.name);
        }
      })
      .catch(() => {
        orgLogoUrl.value = null;
      });
  } else {
    orgLogoUrl.value = null;
  }
};

const showOrgAdminNav = computed(() => {
  if (user.value?.isAdmin) return true;
  return (user.value?.orgRoles || []).some((r) => r.roleName === "Org Admin");
});

const showTripLeaderNav = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Leader")
);

const isTripLeaderOnly = computed(() => {
  if (!user.value || user.value.isAdmin) return false;
  const hasOrgAdmin = (user.value.orgRoles || []).some((r) => r.roleName === "Org Admin");
  return showTripLeaderNav.value && !hasOrgAdmin;
});

const showParticipantNav = computed(() =>
  (user.value?.tripRoles || []).some((r) => r.roleName === "Trip Participant")
);

const showProfileNav = computed(() => Utils.showParticipantOrPendingProfile(user.value));

const showUserOrgSelector = computed(() => {
  if (!user.value || user.value.isAdmin) return false;
  return userOrgItems.value.length > 0;
});

const userDisplayName = computed(() => {
  const name = `${user.value?.firstName || ""} ${user.value?.lastName || ""}`.trim();
  return name || user.value?.email || "User";
});

const userInitials = computed(() => {
  const first = user.value?.firstName?.trim()?.[0] || "";
  const last = user.value?.lastName?.trim()?.[0] || "";
  if (first || last) return `${first}${last}`.toUpperCase();
  const email = user.value?.email?.trim() || "";
  return (email.slice(0, 2) || "U").toUpperCase();
});

const canEditProfile = computed(() => user.value?.personId != null);

const clearUserState = () => {
  user.value = null;
  orgLogoUrl.value = null;
  orgName.value = "Mission Trips";
  actingOrgItems.value = [];
  userOrgItems.value = [];
};

const logout = () => {
  AuthServices.logoutUser(user.value)
    .finally(() => {
      Utils.removeItem("user");
      clearUserState();
      window.dispatchEvent(new CustomEvent("user-logged-out"));
      router.push({ name: "login" });
    });
};

const openProfile = () => {
  if (!canEditProfile.value) return;
  showProfileDialog.value = true;
};

const onProfileSaved = () => {
  AuthServices.me()
    .then((res) => {
      const stored = Utils.getStore("user");
      const updated = { ...stored, ...res.data };
      Utils.setStore("user", updated);
      user.value = updated;
      window.dispatchEvent(new CustomEvent("user-updated"));
    })
    .catch(() => {
      resetMenu();
    });
};

const loadActingOrgs = () => {
  user.value = Utils.getStore("user");
  if (!user.value?.isAdmin) return;
  OrganizationServices.getAllForMenu().then((res) => {
    const orgs = (res.data || []).map((org) => ({ ...org, id: Number(org.id) }));
    actingOrgItems.value = [{ name: "All organizations", id: ALL_ORGS_VALUE }, ...orgs];
  });
};

const loadUserOrgItems = async () => {
  user.value = Utils.getStore("user");
  if (!user.value || user.value.isAdmin) {
    userOrgItems.value = [];
    return;
  }

  const scopeOrgs = Utils.getScopeOrgs(user.value);
  const items = scopeOrgs.map((org) => ({
    name: org.orgName,
    id: Number(org.orgId),
  }));
  userOrgItems.value = items;

  const stored = Utils.getStore("user");
  if (!stored) return;

  const defaultOrgId = scopeOrgs[0]?.orgId ?? null;
  const currentIsValid =
    stored.currentOrgId != null &&
    items.some((item) => Number(item.id) === Number(stored.currentOrgId));

  let nextOrgId = currentIsValid ? Number(stored.currentOrgId) : defaultOrgId;
  if (nextOrgId == null && items.length) nextOrgId = items[0].id;

  const selected = items.find((item) => Number(item.id) === Number(nextOrgId));
  const nextName =
    selected?.name ||
    scopeOrgs.find((o) => Number(o.orgId) === Number(nextOrgId))?.orgName ||
    null;

  if (
    Number(stored.currentOrgId) !== Number(nextOrgId) ||
    stored.currentOrgName !== nextName
  ) {
    const updated = {
      ...stored,
      currentOrgId: nextOrgId,
      currentOrgName: nextName,
    };
    Utils.setStore("user", updated);
    user.value = updated;
    window.dispatchEvent(new CustomEvent("user-updated"));
  }
};

const onActingOrgChange = (val) => {
  const actingOrganizationId =
    val === ALL_ORGS_VALUE || val == null || val === "" ? null : Number(val);
  const u = { ...Utils.getStore("user"), actingOrganizationId };
  if (actingOrganizationId) {
    u.currentOrgId = actingOrganizationId;
    const selected = actingOrgItems.value.find(
      (item) => Number(item.id) === actingOrganizationId
    );
    u.currentOrgName = selected?.name || null;
  } else {
    u.currentOrgName = null;
  }
  Utils.setStore("user", u);
  user.value = u;
  window.dispatchEvent(new CustomEvent("user-updated"));
  resetMenu();
};

const onUserOrgChange = (val) => {
  const currentOrgId = val == null || val === "" ? null : Number(val);
  const allowed = userOrgItems.value.some((item) => Number(item.id) === Number(currentOrgId));
  if (currentOrgId != null && !allowed) return;

  const u = { ...Utils.getStore("user"), currentOrgId };
  if (currentOrgId) {
    const selected = userOrgItems.value.find((item) => Number(item.id) === currentOrgId);
    u.currentOrgName = selected?.name || null;
  } else {
    u.currentOrgName = null;
  }
  Utils.setStore("user", u);
  user.value = u;
  window.dispatchEvent(new CustomEvent("user-updated"));
  resetMenu();
};

onMounted(() => {
  resetMenu();
  loadActingOrgs();
  loadUserOrgItems();
  window.addEventListener("user-logged-in", () => {
    resetMenu();
    loadActingOrgs();
    loadUserOrgItems();
  });
  window.addEventListener("user-updated", () => {
    resetMenu();
    loadUserOrgItems();
  });
  window.addEventListener("user-logged-out", clearUserState);
  window.addEventListener("organizations-updated", () => {
    loadActingOrgs();
    resetMenu();
  });
});
</script>

<template>
  <v-app-bar v-if="user" color="primary" density="compact">
    <v-btn
      icon
      variant="text"
      class="ml-1"
      aria-label="Home"
      :to="{ name: 'home' }"
    >
      <v-avatar v-if="orgLogoUrl" size="36" rounded="0">
        <v-img :src="orgLogoUrl" alt="Organization logo" />
      </v-avatar>
      <v-icon v-else size="28">mdi-home</v-icon>
    </v-btn>
    <v-app-bar-title>{{ orgName }}</v-app-bar-title>
    <v-btn variant="text" :to="{ name: 'home' }">Dashboard</v-btn>
      <v-btn v-if="showProfileNav" variant="text" @click="openProfile">Profile</v-btn>
      <v-btn v-if="user.isAdmin || showOrgAdminNav" variant="text" :to="{ name: 'people' }">People</v-btn>
      <v-btn v-if="user.isAdmin" variant="text" :to="{ name: 'organizations' }">Organizations</v-btn>
      <v-btn v-if="user.isAdmin" variant="text" :to="{ name: 'documentTypes' }">Document types</v-btn>
      <v-btn v-if="showOrgAdminNav || user.isAdmin" variant="text" :to="{ name: 'trips' }">Trips</v-btn>
      <v-btn v-if="isTripLeaderOnly" variant="text" :to="{ name: 'tripPeople' }">Trips</v-btn>
      <v-btn v-if="showOrgAdminNav || showTripLeaderNav || showParticipantNav" variant="text" :to="{ name: 'donations' }">Donations</v-btn>
      <v-btn v-if="user.isAdmin || showOrgAdminNav || showTripLeaderNav" variant="text" :to="{ name: 'templates' }">Templates</v-btn>
      <v-btn v-if="user.isAdmin || showOrgAdminNav" variant="text" :to="{ name: 'workerRoles' }">Worker roles</v-btn>

      <v-select
        v-if="showUserOrgSelector && userOrgItems.length > 1"
        class="ml-4"
        style="max-width: 220px"
        density="compact"
        hide-details
        label="Organization"
        :items="userOrgItems"
        item-title="name"
        item-value="id"
        :model-value="Utils.effectiveOrgId(user)"
        @update:model-value="onUserOrgChange"
      />

      <v-select
        v-if="user.isAdmin"
        class="ml-4"
        style="max-width: 220px"
        density="compact"
        hide-details
        no-filter
        label="Emulate org"
        :items="actingOrgItems"
        item-title="name"
        item-value="id"
        :model-value="user.actingOrganizationId ?? ALL_ORGS_VALUE"
        @update:model-value="onActingOrgChange"
      />

      <v-spacer />

      <v-menu location="bottom end">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon variant="text" aria-label="User menu">
            <v-avatar color="white" size="32">
              <span class="text-primary text-caption font-weight-bold">{{ userInitials }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-list density="compact" min-width="240">
          <v-list-item :title="userDisplayName" :subtitle="user.email" />
          <v-divider />
          <v-list-item v-if="canEditProfile" title="Edit profile" prepend-icon="mdi-account-edit" @click="openProfile" />
          <v-list-item title="Log out" prepend-icon="mdi-logout" @click="logout" />
        </v-list>
      </v-menu>
  </v-app-bar>

  <EditPersonDialog
    v-if="canEditProfile"
    v-model="showProfileDialog"
    :person-id="user.personId"
    @saved="onProfileSaved"
  />
</template>
