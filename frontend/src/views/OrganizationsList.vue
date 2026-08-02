<script setup>
import { ref, onMounted } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import AddOrganizationDialog from "../components/AddOrganizationDialog.vue";
import EditOrganizationDialog from "../components/EditOrganizationDialog.vue";

const organizations = ref([]);
const message = ref("");
const showAddDialog = ref(false);
const showEditDialog = ref(false);
const editOrganizationId = ref(null);

const load = () =>
  OrganizationServices.getAll().then((res) => {
    organizations.value = res.data || [];
  });

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

onMounted(load);
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Organizations</h1>
      <v-btn color="primary" @click="showAddDialog = true">Add</v-btn>
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
        <v-btn size="small" variant="text" @click="openEdit(item)">Edit</v-btn>
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
