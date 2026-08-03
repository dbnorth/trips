<script setup>
import { ref, computed, watch } from "vue";
import PersonServices from "../services/personServices.js";
import OrganizationServices from "../services/organizationServices.js";
import RoleServices from "../services/roleServices.js";
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";
import AddressFields from "./AddressFields.vue";
import PersonProfileFields from "./PersonProfileFields.vue";
import Utils from "../config/utils.js";
import { formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";
import { normalizeAddressFields } from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const user = ref(null);
const organizations = ref([]);
const roles = ref([]);
const formError = ref("");
const saving = ref(false);

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  addLine1: "",
  addLine2: "",
  city: "",
  country: "",
  state_prov: "",
  postalCode: "",
  phoneContryCode: "",
  phoneNumber: "",
  birthDate: "",
  gender: null,
  emergencyContactName: "",
  emergencyContactPhoneCountryCode: "",
  emergencyContactPhoneNumber: "",
  hasAllergies: false,
  allergiesDescription: "",
  takesMedication: false,
  currentChurchHome: "",
  currentChurchHomeCity: "",
  currentChurchHomeStateProv: "",
  bioText: "",
  isAdmin: false,
  orgId: null,
  roleId: null,
});

const form = ref(emptyForm());

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const orgAdminOrgs = computed(() => Utils.getOrgAdminOrgs(user.value));

const orgAdminOrgItems = computed(() =>
  orgAdminOrgs.value.map((r) => ({ title: r.orgName, value: r.orgId }))
);

const selectedOrgAdminOrg = computed(() =>
  orgAdminOrgs.value.find((r) => Number(r.orgId) === Number(form.value.orgId))
);

const resetForm = () => {
  user.value = Utils.getStore("user");
  const defaultOrgId = isSystemAdmin.value
    ? Utils.effectiveOrgId(user.value)
    : Utils.effectiveOrgId(user.value) ?? orgAdminOrgs.value[0]?.orgId ?? null;

  const pendingRole = roles.value.find((r) => r.roleName === "Pending User");

  form.value = {
    ...emptyForm(),
    orgId: defaultOrgId,
    roleId: pendingRole?.id ?? roles.value[0]?.id ?? null,
  };
  formError.value = "";
};

const loadOptions = async () => {
  user.value = Utils.getStore("user");
  const roleRes = await RoleServices.getAll();
  roles.value = roleRes.data || [];

  if (isSystemAdmin.value) {
    const orgRes = await OrganizationServices.getAll();
    organizations.value = orgRes.data || [];
  }

  resetForm();
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) loadOptions();
  }
);

const close = () => emit("update:modelValue", false);

const save = () => {
  if (!form.value.firstName?.trim() || !form.value.lastName?.trim()) {
    formError.value = "First and last name are required.";
    return;
  }
  if (!form.value.email?.trim()) {
    formError.value = "Email is required to create a login account.";
    return;
  }
  if (!form.value.orgId) {
    formError.value = "Organization is required.";
    return;
  }
  if (!form.value.roleId) {
    formError.value = "Role is required.";
    return;
  }
  if (form.value.password && form.value.password.length < 8) {
    formError.value = "Password must be at least 8 characters, or leave blank for a temporary password.";
    return;
  }

  const phoneValidation = validatePhoneFields(form.value.phoneContryCode, form.value.phoneNumber);
  if (phoneValidation !== true) {
    formError.value = phoneValidation;
    return;
  }
  const emergencyPhoneValidation = validatePhoneFields(
    form.value.emergencyContactPhoneCountryCode,
    form.value.emergencyContactPhoneNumber
  );
  if (emergencyPhoneValidation !== true) {
    formError.value = `Emergency contact: ${emergencyPhoneValidation}`;
    return;
  }

  saving.value = true;
  formError.value = "";

  const address = normalizeAddressFields(form.value);

  const payload = {
    firstName: form.value.firstName.trim(),
    lastName: form.value.lastName.trim(),
    email: form.value.email.trim(),
    country: address.country || null,
    addLine1: form.value.addLine1?.trim() || null,
    addLine2: form.value.addLine2?.trim() || null,
    city: form.value.city?.trim() || null,
    state_prov: address.state_prov || null,
    postalCode: form.value.postalCode?.trim() || null,
    phoneContryCode: form.value.phoneContryCode ? formatCountryCode(form.value.phoneContryCode) : null,
    phoneNumber: form.value.phoneNumber?.trim() || null,
    birthDate: form.value.birthDate || null,
    gender: form.value.gender || null,
    emergencyContactName: form.value.emergencyContactName?.trim() || null,
    emergencyContactPhoneCountryCode: form.value.emergencyContactPhoneCountryCode
      ? formatCountryCode(form.value.emergencyContactPhoneCountryCode)
      : null,
    emergencyContactPhoneNumber: form.value.emergencyContactPhoneNumber?.trim() || null,
    hasAllergies: !!form.value.hasAllergies,
    allergiesDescription: form.value.hasAllergies
      ? form.value.allergiesDescription?.trim() || null
      : null,
    takesMedication: !!form.value.takesMedication,
    currentChurchHome: form.value.currentChurchHome?.trim() || null,
    currentChurchHomeCity: form.value.currentChurchHomeCity?.trim() || null,
    currentChurchHomeStateProv: form.value.currentChurchHomeStateProv?.trim() || null,
    bioText: form.value.bioText?.trim() || null,
    orgId: form.value.orgId,
    roleId: form.value.roleId,
  };

  if (form.value.password?.trim()) {
    payload.password = form.value.password.trim();
  }
  if (isSystemAdmin.value && form.value.email?.trim()) {
    payload.isAdmin = !!form.value.isAdmin;
  }

  PersonServices.create(payload)
    .then((res) => {
      emit("saved", res.data);
      close();
    })
    .catch((e) => {
      formError.value = e.response?.data?.message || "Error saving person.";
    })
    .finally(() => {
      saving.value = false;
    });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Add person</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-text-field v-model="form.firstName" label="First name" density="compact" autocomplete="off" />
        <v-text-field v-model="form.lastName" label="Last name" density="compact" autocomplete="off" />
        <v-text-field
          v-model="form.email"
          label="Email"
          type="email"
          density="compact"
          autocomplete="off"
          hint="A user login account is created for this email. If the email already exists, the person is updated and assigned to the organization."
          persistent-hint
        />
        <v-text-field
          v-model="form.password"
          label="Password"
          type="password"
          density="compact"
          autocomplete="new-password"
          hint="Optional. Leave blank to assign a temporary password."
          persistent-hint
        />

        <v-switch
          v-if="isSystemAdmin"
          v-model="form.isAdmin"
          label="System administrator"
          hint="Grants full system admin access for the linked user account"
          persistent-hint
          density="compact"
          color="primary"
          class="mb-2"
        />

        <template v-if="isSystemAdmin">
          <v-select
            v-model="form.orgId"
            :items="organizations"
            item-title="name"
            item-value="id"
            label="Organization"
            density="compact"
          />
        </template>

        <template v-else>
          <v-select
            v-if="orgAdminOrgs.length > 1"
            v-model="form.orgId"
            :items="orgAdminOrgItems"
            label="Organization"
            density="compact"
          />
          <v-text-field
            v-else
            :model-value="selectedOrgAdminOrg?.orgName || orgAdminOrgs[0]?.orgName"
            label="Organization"
            hint="You are Org Admin for this organization"
            persistent-hint
            density="compact"
            readonly
          />
        </template>

        <v-select
          v-model="form.roleId"
          :items="roles"
          item-title="roleName"
          item-value="id"
          label="Role"
          density="compact"
        >
          <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps" :subtitle="item.raw.roleDescription" />
          </template>
        </v-select>

        <AddressFields v-model="form" />

        <v-row dense>
          <v-col cols="4">
            <PhoneCountryCodeInput v-model="form.phoneContryCode" label="Phone country code" />
          </v-col>
          <v-col cols="8">
            <PhoneInput v-model="form.phoneNumber" label="Phone number" />
          </v-col>
        </v-row>
        <PersonProfileFields v-model="form" />
        <v-textarea v-model="form.bioText" label="Bio" density="compact" rows="3" autocomplete="off" />

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
