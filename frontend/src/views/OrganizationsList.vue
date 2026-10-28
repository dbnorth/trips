<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import AddOrganizationDialog from "../components/AddOrganizationDialog.vue";
import EditOrganizationDialog from "../components/EditOrganizationDialog.vue";
import RowAction from "../components/RowAction.vue";
import Utils from "../config/utils.js";

const organizations = ref([]);
const user = ref(Utils.getStore("user"));
const message = ref("");
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editOrganizationId = ref(null);

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));
const effectiveOrgId = computed(() => Utils.effectiveOrgId(user.value));

const load = () => {
  user.value = Utils.getStore("user");
  return OrganizationServices.getAll().then((res) => {
    const rows = res.data || [];
    organizations.value = isSystemAdmin.value
      ? rows
      : rows.filter(
          (org) =>
            Number(org.id) === Number(effectiveOrgId.value) && Utils.isOrgAdmin(user.value, org.id)
        );
  });
};

const onOrganizationAdded = () => {
  message.value = "Organization added.";
  load();
  window.dispatchEvent(new CustomEvent("organizations-updated"));
};

const onOrganizationUpdated = () => {
  message.value = "Organization updated.";
  load();
  window.dispatchEvent(new CustomEvent("organizations-updated"));
};

const openEdit = (org) => {
  editOrganizationId.value = org.id;
  showEditDialog.value = true;
};

onMounted(() => {
  load();
  window.addEventListener("user-updated", load);
});

onUnmounted(() => {
  window.removeEventListener("user-updated", load);
});
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Organizations</h1>
      <v-btn v-if="isSystemAdmin" color="primary" @click="showAddDialog = true">Add</v-btn>
    </div>

    <v-alert v-if="message" type="info" density="compact" class="mb-4">{{ message }}</v-alert>

    <v-data-table
      :items="organizations"
      :headers="[
        { title: 'Name', key: 'name' },
        { title: 'Email', key: 'email' },
        { title: 'City', key: 'city' },
        { title: 'Color', key: 'colorFamily' },
        { title: 'Actions', key: 'actions', sortable: false },
      ]"
      density="compact"
    >
      <template #item.actions="{ item }">
        <RowAction icon="mdi-pencil" label="Edit" @click="openEdit(item)" />
      </template>
    </v-data-table>

    <AddOrganizationDialog v-model="showAddDialog" @saved="onOrganizationAdded" />
    <EditOrganizationDialog
      v-model="showEditDialog"
      :organization-id="editOrganizationId"
      @saved="onOrganizationUpdated"
    />
  </v-container>
</template>
