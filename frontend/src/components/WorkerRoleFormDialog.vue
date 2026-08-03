<script setup>
import { ref, computed, watch, onMounted } from "vue";
import WorkerRoleServices from "../services/workerRoleServices.js";
import DocumentTypeServices from "../services/documentTypeServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  roleId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");

const emptyForm = () => ({
  name: "",
  description: "",
  licenseRequired: false,
  documentTypeId: null,
  status: "active",
});

const form = ref(emptyForm());

const documentTypes = ref([]);
const documentTypeItems = computed(() =>
  documentTypes.value.map((d) => ({ title: d.description, value: d.id }))
);

const loadDocumentTypes = async () => {
  try {
    const res = await DocumentTypeServices.getAll();
    documentTypes.value = res.data || [];
  } catch {
    documentTypes.value = [];
  }
};

onMounted(loadDocumentTypes);

const isEdit = computed(() => props.roleId != null && props.roleId !== "");
const title = computed(() => (isEdit.value ? "Edit worker role" : "Add worker role"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const statusItems = [
  { title: "Active", value: "active" },
  { title: "Inactive", value: "inactive" },
];

const loadRole = async () => {
  formError.value = "";
  if (!isEdit.value) {
    form.value = emptyForm();
    return;
  }
  try {
    const res = await WorkerRoleServices.get(props.roleId);
    const row = res.data;
    form.value = {
      name: row.name || "",
      description: row.description || "",
      licenseRequired: !!row.licenseRequired,
      documentTypeId: row.documentTypeId ?? null,
      status: row.status || "active",
    };
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load worker role.";
  }
};

watch(
  () => [props.modelValue, props.roleId],
  ([visible]) => {
    if (visible) loadRole();
  }
);

watch(
  () => form.value.licenseRequired,
  (required) => {
    if (!required) form.value.documentTypeId = null;
  }
);

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  if (!form.value.name?.trim()) {
    formError.value = "Name is required.";
    return;
  }
  if (!isEdit.value && !props.orgId) {
    formError.value = "Organization is required.";
    return;
  }
  if (form.value.licenseRequired && !form.value.documentTypeId) {
    formError.value = "Document type is required when a license is required.";
    return;
  }

  saving.value = true;
  const payload = {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || null,
    licenseRequired: !!form.value.licenseRequired,
    documentTypeId: form.value.licenseRequired ? form.value.documentTypeId : null,
    status: form.value.status,
  };
  if (!isEdit.value) payload.orgId = Number(props.orgId);

  try {
    if (isEdit.value) {
      await WorkerRoleServices.update(props.roleId, payload);
    } else {
      await WorkerRoleServices.create(payload);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save worker role.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" persistent>
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>
        <v-text-field v-model="form.name" label="Name" density="compact" class="mb-2" required />
        <v-textarea
          v-model="form.description"
          label="Description"
          density="compact"
          rows="3"
          class="mb-2"
        />
        <v-switch
          v-model="form.licenseRequired"
          label="License required"
          density="compact"
          color="primary"
          hide-details
          class="mb-2"
        />
        <v-select
          v-if="form.licenseRequired"
          v-model="form.documentTypeId"
          :items="documentTypeItems"
          label="Document type"
          density="compact"
          hint="Document required for this role"
          persistent-hint
          class="mb-2"
          :no-data-text="'No document types available'"
          required
        />
        <v-select
          v-model="form.status"
          :items="statusItems"
          label="Status"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
