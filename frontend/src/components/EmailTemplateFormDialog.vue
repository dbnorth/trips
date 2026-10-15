<script setup>
import { ref, computed, watch } from "vue";
import EmailTemplateServices from "../services/emailTemplateServices.js";
import EmailTypeServices from "../services/emailTypeServices.js";
import OrganizationServices from "../services/organizationServices.js";
import TripServices from "../services/tripServices.js";
import Utils from "../config/utils.js";

const FUNCTION_CODE_ITEMS = [
  { title: "Scheduled", value: "Scheduled" },
  { title: "Send Now", value: "Send Now" },
];

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  templateId: { type: [Number, String], default: null },
  orgId: { type: [Number, String], default: null },
  allowGlobal: { type: Boolean, default: false },
  fixedTripId: { type: [Number, String], default: null },
  fixedTripName: { type: String, default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");
const trips = ref([]);
const tripsLoading = ref(false);
const copySources = ref([]);
const copySourcesLoading = ref(false);
const copyFromCode = ref(null);
const user = ref(null);
const organizations = ref([]);
const orgsLoading = ref(false);
const emailTypes = ref([]);
const emailTypesLoading = ref(false);

const emptyForm = () => ({
  orgId: null,
  tripId: null,
  emailTypeId: null,
  fromEmail: "",
  functionCode: null,
  subject: "",
  content: "",
  emailBody: "",
  attachment: "",
});

const form = ref(emptyForm());

const isEdit = computed(() => props.templateId != null && props.templateId !== "");
const isSystemAdminUser = computed(() => !!user.value?.isAdmin || props.allowGlobal);
const isTripLeaderAdd = computed(
  () => !isEdit.value && props.fixedTripId != null && props.fixedTripId !== ""
);
const showCopyFromPicker = computed(() => !isEdit.value && form.value.orgId != null);
const title = computed(() => (isEdit.value ? "Edit template" : "Add template"));

const adminOrgOptions = computed(() => {
  const seen = new Set();
  const items = [];
  for (const role of user.value?.orgRoles || []) {
    if (role.roleName !== "Org Admin") continue;
    const id = Number(role.orgId);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push({ title: role.orgName || `Organization ${id}`, value: id });
  }
  return items;
});

const organizationItems = computed(() => {
  if (isSystemAdminUser.value) {
    return organizations.value.map((org) => ({ title: org.name, value: org.id }));
  }
  if (adminOrgOptions.value.length) return adminOrgOptions.value;
  if (props.orgId != null && props.orgId !== "") {
    const id = Number(props.orgId);
    return [{ title: Utils.orgDisplayName(user.value, id) || "Organization", value: id }];
  }
  return [];
});

const organizationFixed = computed(
  () => !isSystemAdminUser.value && organizationItems.value.length <= 1
);
const fixedOrganizationName = computed(() => organizationItems.value[0]?.title || "");

const tripItems = computed(() => [
  { title: "All trips (organization-wide)", value: null },
  ...trips.value.map((trip) => ({ title: trip.name, value: trip.id })),
]);

const emailTypeItems = computed(() =>
  [...emailTypes.value]
    .sort((a, b) => String(a.description || "").localeCompare(String(b.description || "")))
    .map((row) => ({ title: row.description, value: row.id }))
);

const copySourceItems = computed(() =>
  copySources.value.map((template) => ({
    title: template.subject
      ? `${template.functionCode} — ${template.subject}`
      : template.functionCode,
    value: template.functionCode,
  }))
);

const functionCodeHint = computed(() => {
  if (form.value.tripId != null) {
    return "Copy from an organization-wide template for this function code";
  }
  return "Copy from a global master template for this function code";
});

const normalizeFunctionCode = (code) =>
  code === "Scheduled" || code === "Send Now" ? code : null;

const loadOrganizations = async () => {
  if (!isSystemAdminUser.value) {
    organizations.value = [];
    return;
  }
  orgsLoading.value = true;
  try {
    const res = await OrganizationServices.getAll();
    organizations.value = res.data || [];
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load organizations.";
    organizations.value = [];
  } finally {
    orgsLoading.value = false;
  }
};

const loadEmailTypes = async () => {
  emailTypesLoading.value = true;
  try {
    const res = await EmailTypeServices.getAll();
    emailTypes.value = res.data || [];
  } catch (e) {
    emailTypes.value = [];
  } finally {
    emailTypesLoading.value = false;
  }
};

const loadTrips = async () => {
  const orgId = form.value.orgId;
  if (!orgId) {
    trips.value = [];
    return;
  }
  tripsLoading.value = true;
  try {
    const res = await TripServices.getAll();
    trips.value = (res.data || []).filter((trip) => Number(trip.orgId) === Number(orgId));
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trips.";
    trips.value = [];
  } finally {
    tripsLoading.value = false;
  }
};

const loadCopySources = async () => {
  if (!showCopyFromPicker.value) {
    copySources.value = [];
    return;
  }
  copySourcesLoading.value = true;
  try {
    const params = form.value.tripId != null ? { tripId: form.value.tripId } : {};
    const res = await EmailTemplateServices.getCopySources(params);
    copySources.value = res.data || [];
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load function codes.";
    copySources.value = [];
  } finally {
    copySourcesLoading.value = false;
  }
};

const assignDefaultOrg = () => {
  if (organizationFixed.value && organizationItems.value.length === 1) {
    form.value.orgId = organizationItems.value[0].value;
    return;
  }
  if (props.orgId != null && props.orgId !== "") {
    const id = Number(props.orgId);
    if (isSystemAdminUser.value || organizationItems.value.some((item) => item.value === id)) {
      form.value.orgId = id;
    }
  }
};

const applyTemplate = (row) => {
  form.value = {
    orgId: row?.orgId ?? null,
    tripId: row?.tripId ?? null,
    emailTypeId: row?.emailTypeId ?? null,
    fromEmail: row?.fromEmail || "",
    functionCode: normalizeFunctionCode(row?.functionCode),
    subject: row?.subject || "",
    content: row?.content || "",
    emailBody: row?.emailBody || "",
    attachment: row?.attachment || "",
  };
  if (form.value.orgId == null) assignDefaultOrg();
};

const applyCopySource = (functionCode) => {
  if (!functionCode) return;
  const source = copySources.value.find((template) => template.functionCode === functionCode);
  if (!source) return;
  form.value.fromEmail = source.fromEmail || "";
  form.value.subject = source.subject || "";
  form.value.content = source.content || "";
  form.value.attachment = source.attachment || "";
};

const loadTemplate = async () => {
  if (!isEdit.value) {
    form.value = emptyForm();
    assignDefaultOrg();
    if (isTripLeaderAdd.value) {
      form.value.tripId = Number(props.fixedTripId);
    }
    formError.value = "";
    return;
  }
  try {
    const res = await EmailTemplateServices.get(props.templateId);
    applyTemplate(res.data);
    formError.value = "";
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load template.";
  }
};

watch(
  () => [props.modelValue, props.templateId, props.orgId, props.fixedTripId],
  async ([open]) => {
    if (!open) {
      form.value = emptyForm();
      copySources.value = [];
      copyFromCode.value = null;
      emailTypes.value = [];
      organizations.value = [];
      formError.value = "";
      return;
    }
    user.value = Utils.getStore("user");
    await loadOrganizations();
    await loadEmailTypes();
    await loadTemplate();
    await loadTrips();
    if (showCopyFromPicker.value) {
      await loadCopySources();
    }
  },
  { immediate: true }
);

watch(
  () => form.value.tripId,
  async () => {
    if (!showCopyFromPicker.value || !props.modelValue) return;
    copyFromCode.value = null;
    await loadCopySources();
  }
);

watch(
  () => form.value.orgId,
  async (orgId, previous) => {
    if (!props.modelValue || orgId === previous) return;
    if (!isTripLeaderAdd.value) {
      await loadTrips();
    }
    if (showCopyFromPicker.value) {
      copyFromCode.value = null;
      await loadCopySources();
    }
  }
);

const close = () => emit("update:modelValue", false);

const save = async () => {
  formError.value = "";
  if (!form.value.orgId) {
    formError.value = "Organization is required.";
    return;
  }
  if (!form.value.emailTypeId) {
    formError.value = "Email type is required.";
    return;
  }
  if (form.value.functionCode !== "Scheduled" && form.value.functionCode !== "Send Now") {
    formError.value = "Function code is required.";
    return;
  }
  if (!form.value.subject?.trim()) {
    formError.value = "Subject is required.";
    return;
  }
  if (!form.value.fromEmail?.trim()) {
    formError.value = "From email is required.";
    return;
  }
  if (!form.value.emailBody?.trim()) {
    formError.value = "Email body is required.";
    return;
  }
  if (isTripLeaderAdd.value && !props.fixedTripId) {
    formError.value = "Trip is required.";
    return;
  }

  const payload = {
    orgId: Number(form.value.orgId),
    emailTypeId: Number(form.value.emailTypeId),
    tripId: isTripLeaderAdd.value
      ? Number(props.fixedTripId)
      : form.value.tripId != null
        ? Number(form.value.tripId)
        : null,
    fromEmail: form.value.fromEmail.trim(),
    functionCode: form.value.functionCode,
    subject: form.value.subject.trim(),
    content: form.value.content?.trim() || null,
    emailBody: form.value.emailBody.trim(),
    attachment: form.value.attachment?.trim() || null,
  };

  saving.value = true;
  const request = isEdit.value
    ? EmailTemplateServices.update(props.templateId, payload)
    : EmailTemplateServices.create(payload);

  request
    .then(() => {
      emit("saved");
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error saving template.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text style="max-height: 70vh">
        <v-alert v-if="isTripLeaderAdd" type="info" variant="tonal" density="compact" class="mb-3">
          Template for trip: {{ fixedTripName || "Selected trip" }}
        </v-alert>
        <v-text-field
          v-if="organizationFixed"
          :model-value="fixedOrganizationName"
          label="Organization"
          density="compact"
          disabled
          class="mb-2"
        />
        <v-select
          v-else
          v-model="form.orgId"
          :items="organizationItems"
          label="Organization"
          density="compact"
          :loading="orgsLoading"
          class="mb-2"
        />
        <v-select
          v-model="form.emailTypeId"
          :items="emailTypeItems"
          label="Email type"
          density="compact"
          :loading="emailTypesLoading"
          class="mb-2"
        />
        <v-select
          v-model="form.functionCode"
          :items="FUNCTION_CODE_ITEMS"
          label="Function code"
          density="compact"
          class="mb-2"
        />
        <v-select
          v-if="!isTripLeaderAdd"
          v-model="form.tripId"
          :items="tripItems"
          label="Trip"
          density="compact"
          :loading="tripsLoading"
          hide-details
          class="mb-2"
        />
        <v-autocomplete
          v-if="showCopyFromPicker"
          v-model="copyFromCode"
          :items="copySourceItems"
          item-title="title"
          item-value="value"
          label="Copy from"
          density="compact"
          clearable
          :loading="copySourcesLoading"
          :hint="functionCodeHint"
          persistent-hint
          hide-details
          class="mb-2"
          @update:model-value="applyCopySource"
        />
        <v-text-field
          v-model="form.subject"
          label="Subject"
          density="compact"
          autocomplete="off"
          :rules="[(v) => !!v?.trim() || 'Subject is required']"
        />
        <v-text-field v-model="form.fromEmail" label="From email" type="email" density="compact" autocomplete="off" />
        <v-textarea v-model="form.emailBody" label="Email body" density="compact" rows="8" />
        <v-textarea v-model="form.content" label="Content" density="compact" rows="4" />
        <v-text-field
          v-model="form.attachment"
          label="Attachment path"
          density="compact"
          hint="Optional file path or URL"
          persistent-hint
          autocomplete="off"
        />
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
