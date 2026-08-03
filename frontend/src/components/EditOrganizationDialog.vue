<script setup>
import { ref, watch, computed } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import OrganizationFormFields from "./OrganizationFormFields.vue";
import OrganizationAgreementDialog from "./OrganizationAgreementDialog.vue";
import { emptyOrganizationForm, buildOrganizationPayload } from "../utils/organizationForm.js";
import { normalizeAddressFields } from "../utils/locationData.js";
import { formatPhoneForDisplay, formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  organizationId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const logoFile = ref(null);
const logoPreview = ref(null);
const showAgreementDialog = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const form = ref(emptyOrganizationForm());

const currentLogoUrl = computed(() => OrganizationServices.getLogoUrl(form.value.logo));
const hasAgreement = computed(() => !!form.value.agreementFileName);

const clearLogoSelection = () => {
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value);
  logoFile.value = null;
  logoPreview.value = null;
};

const onLogoSelected = (files) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value);
  logoFile.value = file || null;
  logoPreview.value = file ? URL.createObjectURL(file) : null;
};

const applyOrgData = (data) => {
  const normalized = normalizeAddressFields(data || {});
  form.value = {
    ...emptyOrganizationForm(),
    ...data,
    ...normalized,
    phoneNumber: formatPhoneForDisplay(data.phoneNumber),
    phoneContryCode: data.phoneContryCode ? formatCountryCode(data.phoneContryCode) : "",
  };
  clearLogoSelection();
};

const loadOrganization = async ({ afterConflict = false } = {}) => {
  if (!props.organizationId) return;
  loading.value = true;
  onLoadStart({ afterConflict });
  try {
    const res = await OrganizationServices.get(props.organizationId);
    applyOrgData(res.data || {});
    onLoadSuccess({ afterConflict });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load organization.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.organizationId],
  ([open, id]) => {
    if (open && id) loadOrganization();
    if (!open) clearLogoSelection();
  }
);

const close = () => {
  clearLogoSelection();
  showAgreementDialog.value = false;
  emit("update:modelValue", false);
};

const openAgreement = () => {
  showAgreementDialog.value = true;
};

const onAgreementSaved = (data) => {
  if (data?.agreementFileName) {
    form.value.agreementFileName = data.agreementFileName;
  }
};

const save = async () => {
  if (!form.value.name?.trim()) {
    formError.value = "Organization name is required.";
    return;
  }

  const phoneValidation = validatePhoneFields(form.value.phoneContryCode, form.value.phoneNumber);
  if (phoneValidation !== true) {
    formError.value = phoneValidation;
    return;
  }

  saving.value = true;
  prepareSave();

  const payload = buildOrganizationPayload(
    {
      ...form.value,
      phoneContryCode: form.value.phoneContryCode ? formatCountryCode(form.value.phoneContryCode) : "",
    },
    { includeVersion: true }
  );

  try {
    await OrganizationServices.update(form.value.id, payload);
    if (logoFile.value) {
      await OrganizationServices.uploadLogo(form.value.id, logoFile.value);
    }
    emit("saved");
    close();
  } catch (e) {
    await handleSaveError(e, loadOrganization, "Error saving organization.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Edit organization</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
          <OrganizationFormFields v-model="form" />

          <div class="mt-2 mb-2">
            <div class="text-subtitle-2 mb-2">Logo</div>
            <div class="d-flex align-center ga-3 mb-2">
              <v-avatar v-if="logoPreview || currentLogoUrl" size="56" rounded="0">
                <v-img :src="logoPreview || currentLogoUrl" alt="Organization logo" />
              </v-avatar>
              <span v-else class="text-caption text-medium-emphasis">No logo uploaded</span>
            </div>
            <v-file-input
              label="Upload logo"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              density="compact"
              prepend-icon="mdi-camera"
              show-size
              clearable
              hide-details
              @update:model-value="onLogoSelected"
            />
          </div>

          <div class="mt-4 mb-2">
            <div class="text-subtitle-2 mb-2">Participant agreement</div>
            <div class="text-caption text-medium-emphasis mb-2">
              <span v-if="hasAgreement">Markdown agreement on file.</span>
              <span v-else>No participant agreement saved yet.</span>
            </div>
            <v-btn variant="tonal" color="primary" size="small" @click="openAgreement">
              Edit participant agreement
            </v-btn>
          </div>
        </template>

        <v-alert v-if="formNotice" type="warning" density="compact" class="mt-2">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>

    <OrganizationAgreementDialog
      v-model="showAgreementDialog"
      :organization-id="organizationId || form.id"
      :organization-name="form.name"
      @saved="onAgreementSaved"
    />
  </v-dialog>
</template>
