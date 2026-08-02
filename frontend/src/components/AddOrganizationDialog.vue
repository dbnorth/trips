<script setup>
import { ref, watch } from "vue";
import OrganizationServices from "../services/organizationServices.js";
import OrganizationFormFields from "./OrganizationFormFields.vue";
import { emptyOrganizationForm, buildOrganizationPayload } from "../utils/organizationForm.js";
import { formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const formError = ref("");
const saving = ref(false);
const logoFile = ref(null);
const logoPreview = ref(null);
const form = ref(emptyOrganizationForm());

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

const resetForm = () => {
  form.value = emptyOrganizationForm();
  formError.value = "";
  clearLogoSelection();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetForm();
  }
);

const close = () => {
  clearLogoSelection();
  emit("update:modelValue", false);
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
  formError.value = "";

  const payload = buildOrganizationPayload({
    ...form.value,
    phoneContryCode: form.value.phoneContryCode ? formatCountryCode(form.value.phoneContryCode) : "",
  });

  try {
    const res = await OrganizationServices.create(payload);
    const org = res.data;
    if (logoFile.value && org?.id) {
      await OrganizationServices.uploadLogo(org.id, logoFile.value);
    }
    emit("saved", org);
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Error saving organization.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Add organization</v-card-title>

      <v-card-text style="max-height: 70vh">
        <OrganizationFormFields v-model="form" />

        <div class="mt-2 mb-2">
          <div class="text-subtitle-2 mb-2">Logo</div>
          <div class="d-flex align-center ga-3 mb-2">
            <v-avatar v-if="logoPreview" size="56" rounded="0">
              <v-img :src="logoPreview" alt="Organization logo preview" />
            </v-avatar>
            <span v-else class="text-caption text-medium-emphasis">Optional — upload after name is set</span>
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

        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
