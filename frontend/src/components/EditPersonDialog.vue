<script setup>
import { ref, computed, watch } from "vue";
import PersonServices from "../services/personServices.js";
import AuthServices from "../services/authServices.js";
import OrganizationServices from "../services/organizationServices.js";
import RoleServices from "../services/roleServices.js";
import OrgPeopleRoleServices from "../services/orgPeopleRoleServices.js";
import PhoneInput from "./PhoneInput.vue";
import PhoneCountryCodeInput from "./PhoneCountryCodeInput.vue";
import AddressFields from "./AddressFields.vue";
import PersonProfileFields from "./PersonProfileFields.vue";
import PersonDocumentsCard from "./PersonDocumentsCard.vue";
import Utils from "../config/utils.js";
import { formatPhoneForDisplay, formatCountryCode, validatePhoneFields } from "../utils/phoneUtils.js";
import { normalizeAddressFields } from "../utils/locationData.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  personId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved", "orgs-changed"]);

const loading = ref(false);
const saving = ref(false);
const orgRolesLoading = ref(false);
const orgRoleBusy = ref(false);
const orgRoleError = ref("");
const orgRoleSuccess = ref("");
const organizations = ref([]);
const roles = ref([]);
const orgRoles = ref([]);
const newOrgRole = ref({ orgId: null, roleId: null });
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();
const formRef = ref(null);
const form = ref(emptyForm());
const showChangePasswordDialog = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const passwordError = ref("");
const passwordSaving = ref(false);
const pictureFile = ref(null);
const picturePreview = ref(null);

const resetPasswordFields = () => {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  passwordError.value = "";
};

const closeChangePasswordDialog = () => {
  showChangePasswordDialog.value = false;
  resetPasswordFields();
};

const openChangePasswordDialog = () => {
  resetPasswordFields();
  showChangePasswordDialog.value = true;
};

const clearPictureSelection = () => {
  if (picturePreview.value) URL.revokeObjectURL(picturePreview.value);
  pictureFile.value = null;
  picturePreview.value = null;
};

const onPictureSelected = (files) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (picturePreview.value) URL.revokeObjectURL(picturePreview.value);
  pictureFile.value = file || null;
  picturePreview.value = file ? URL.createObjectURL(file) : null;
};

const currentPictureUrl = computed(() => PersonServices.getPictureUrl(form.value.picture));

function emptyForm() {
  return {
    id: null,
    userId: null,
    firstName: "",
    lastName: "",
    email: "",
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
    picture: null,
    isAdmin: false,
    version: 0,
  };
}

const isSystemAdmin = computed(() => Utils.isSystemAdmin(Utils.getStore("user")));

const isSelfProfile = computed(() => {
  const currentUser = Utils.getStore("user");
  return (
    currentUser?.personId != null &&
    form.value.id != null &&
    Number(currentUser.personId) === Number(form.value.id)
  );
});

const dialogTitle = computed(() => (isSelfProfile.value ? "Edit profile" : "Edit person"));

const canEditAdminFlag = computed(
  () => isSystemAdmin.value && !!form.value.email?.trim()
);

const canChangePassword = computed(() => !!form.value.userId);

const showChangePasswordButton = computed(() => isSelfProfile.value && canChangePassword.value);

const showAdminPasswordField = computed(() => !isSelfProfile.value && canChangePassword.value);

const hasDuplicateOrgRole = (orgId, roleId) =>
  orgRoles.value.some(
    (row) => Number(row.orgId) === Number(orgId) && Number(row.roleId) === Number(roleId)
  );

const applyPersonData = (data) => {
  const normalized = normalizeAddressFields(data || {});
  form.value = {
    ...emptyForm(),
    ...data,
    ...normalized,
    isAdmin: !!(data.isAdmin === true || data.isAdmin === 1),
    phoneNumber: formatPhoneForDisplay(data.phoneNumber),
    phoneContryCode: data.phoneContryCode ? formatCountryCode(data.phoneContryCode) : "",
    emergencyContactPhoneNumber: formatPhoneForDisplay(data.emergencyContactPhoneNumber),
    emergencyContactPhoneCountryCode: data.emergencyContactPhoneCountryCode
      ? formatCountryCode(data.emergencyContactPhoneCountryCode)
      : "",
  };
  clearPictureSelection();
};

const loadOrgRoleOptions = async () => {
  if (!isSystemAdmin.value) return;
  const [orgRes, roleRes] = await Promise.all([
    OrganizationServices.getAllForMenu(),
    RoleServices.getAll(),
  ]);
  organizations.value = orgRes.data || [];
  roles.value = roleRes.data || [];
  const pendingRole = roles.value.find((r) => r.roleName === "Pending User");
  newOrgRole.value = {
    orgId: null,
    roleId: pendingRole?.id ?? roles.value[0]?.id ?? null,
  };
};

const personRecordId = () => Number(props.personId || form.value.id);

const apiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  return data?.message || fallback;
};

const normalizeOrgRoleRows = (data) => (Array.isArray(data) ? data : []);

const loadOrgRoles = async () => {
  const peopleId = personRecordId();
  if (!isSystemAdmin.value || !peopleId) return;
  orgRolesLoading.value = true;
  orgRoleError.value = "";
  try {
    const res = await OrgPeopleRoleServices.getByPerson(peopleId);
    orgRoles.value = normalizeOrgRoleRows(res.data);
  } catch (e) {
    orgRoleError.value = apiErrorMessage(e, "Unable to load organization roles.");
  } finally {
    orgRolesLoading.value = false;
  }
};

const loadPerson = async ({ afterConflict = false } = {}) => {
  if (!props.personId) return;
  loading.value = true;
  onLoadStart({ afterConflict });
  try {
    const r = await PersonServices.get(props.personId);
    applyPersonData(r.data || {});
    if (isSystemAdmin.value) {
      await Promise.all([loadOrgRoleOptions(), loadOrgRoles()]);
    }
    onLoadSuccess({ afterConflict });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load person.";
  } finally {
    loading.value = false;
  }
};

const addOrgRole = async () => {
  const peopleId = personRecordId();
  if (!peopleId) {
    orgRoleError.value = "Person must be loaded before adding an organization.";
    return;
  }
  if (!newOrgRole.value.orgId) {
    orgRoleError.value = "Organization is required.";
    return;
  }
  if (!newOrgRole.value.roleId) {
    orgRoleError.value = "Role is required.";
    return;
  }
  if (hasDuplicateOrgRole(newOrgRole.value.orgId, newOrgRole.value.roleId)) {
    orgRoleError.value = "This person already has that role for the selected organization.";
    return;
  }

  orgRoleBusy.value = true;
  orgRoleError.value = "";
  orgRoleSuccess.value = "";
  try {
    const res = await OrgPeopleRoleServices.create({
      peopleId,
      orgId: Number(newOrgRole.value.orgId),
      roleId: Number(newOrgRole.value.roleId),
    });
    orgRoleSuccess.value = res.data?.message || "Organization role saved.";
    const pendingRole = roles.value.find((r) => r.roleName === "Pending User");
    newOrgRole.value = {
      orgId: null,
      roleId: pendingRole?.id ?? roles.value[0]?.id ?? null,
    };
    await loadOrgRoles();
    emit("orgs-changed");
  } catch (e) {
    orgRoleError.value = apiErrorMessage(e, "Error adding organization role.");
  } finally {
    orgRoleBusy.value = false;
  }
};

const removeOrgRole = async (row) => {
  orgRoleBusy.value = true;
  orgRoleError.value = "";
  orgRoleSuccess.value = "";
  try {
    await OrgPeopleRoleServices.delete(row.id);
    orgRoleSuccess.value = "Organization role removed.";
    await loadOrgRoles();
    emit("orgs-changed");
  } catch (e) {
    orgRoleError.value = apiErrorMessage(e, "Error removing organization role.");
  } finally {
    orgRoleBusy.value = false;
  }
};

watch(
  () => [props.modelValue, props.personId],
  ([open, id]) => {
    if (open && id) {
      closeChangePasswordDialog();
      loadPerson();
    }
    if (!open) {
      closeChangePasswordDialog();
      clearPictureSelection();
    }
  }
);

const close = () => {
  closeChangePasswordDialog();
  clearPictureSelection();
  emit("update:modelValue", false);
};

const validateAdminPassword = () => {
  if (showAdminPasswordField.value && newPassword.value) {
    if (newPassword.value.length < 8) {
      formError.value = "Password must be at least 8 characters.";
      return false;
    }
  }
  return true;
};

const saveChangePassword = async () => {
  passwordError.value = "";
  if (!currentPassword.value) {
    passwordError.value = "Current password is required.";
    return;
  }
  if (!newPassword.value) {
    passwordError.value = "New password is required.";
    return;
  }
  if (newPassword.value.length < 8) {
    passwordError.value = "New password must be at least 8 characters.";
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = "New passwords do not match.";
    return;
  }

  passwordSaving.value = true;
  try {
    await AuthServices.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });
    closeChangePasswordDialog();
  } catch (e) {
    passwordError.value = e.response?.data?.message || "Unable to change password.";
  } finally {
    passwordSaving.value = false;
  }
};

const save = async () => {
  formError.value = "";
  const { valid } = (await formRef.value?.validate()) ?? { valid: true };
  if (!valid) return;

  if (isSystemAdmin.value && newOrgRole.value.orgId) {
    await addOrgRole();
    if (orgRoleError.value) return;
  }

  if (!form.value.firstName?.trim() || !form.value.lastName?.trim()) {
    formError.value = "First and last name are required.";
    return;
  }
  if (form.value.userId && !form.value.email?.trim()) {
    formError.value = "Email is required for a person linked to a user account.";
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
  if (!validateAdminPassword()) return;

  saving.value = true;
  prepareSave();

  try {
    const address = normalizeAddressFields(form.value);

    const payload = {
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: form.value.email?.trim() || null,
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
      version: form.value.version,
    };

    if (isSystemAdmin.value && form.value.email?.trim()) {
      payload.isAdmin = !!form.value.isAdmin;
    }
    if (showAdminPasswordField.value && newPassword.value?.trim()) {
      payload.password = newPassword.value.trim();
    }

    await PersonServices.update(form.value.id, payload);
    if (pictureFile.value) {
      await PersonServices.uploadPicture(form.value.id, pictureFile.value);
    }
    resetPasswordFields();
    clearPictureSelection();
    emit("saved");
    close();
  } catch (e) {
    await handleSaveError(e, loadPerson, "Error saving person.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="700" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>{{ dialogTitle }}</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
          <v-form ref="formRef" @submit.prevent="save">
          <v-text-field v-model="form.firstName" label="First name" density="compact" autocomplete="off" :rules="[(v) => !!v?.trim() || 'First name is required']" />
          <v-text-field v-model="form.lastName" label="Last name" density="compact" autocomplete="off" :rules="[(v) => !!v?.trim() || 'Last name is required']" />
          <v-text-field
            v-model="form.email"
            label="Email"
            type="email"
            density="compact"
            autocomplete="off"
            :hint="form.userId ? 'Updates the linked user login email' : ''"
            persistent-hint
          />
          <v-switch
            v-if="canEditAdminFlag"
            v-model="form.isAdmin"
            label="System administrator"
            :hint="
              form.userId
                ? 'Grants full system admin access for the linked user account'
                : 'A user account will be linked by email when saved'
            "
            persistent-hint
            density="compact"
            color="primary"
            class="mb-2"
          />

          <v-btn
            v-if="showChangePasswordButton"
            type="button"
            variant="tonal"
            class="mb-3"
            @click="openChangePasswordDialog"
          >
            Change password
          </v-btn>

          <v-text-field
            v-else-if="showAdminPasswordField"
            v-model="newPassword"
            label="New password"
            type="password"
            density="compact"
            autocomplete="new-password"
            hint="Optional. Leave blank to keep the current password."
            persistent-hint
            class="mb-2"
          />

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

          <div class="mt-2 mb-2">
            <div class="text-subtitle-2 mb-2">Profile photo</div>
            <div class="d-flex align-center ga-3 mb-2">
              <v-avatar v-if="picturePreview || currentPictureUrl" size="72" rounded="lg">
                <v-img :src="picturePreview || currentPictureUrl" alt="Profile photo" cover />
              </v-avatar>
              <span v-else class="text-caption text-medium-emphasis">No photo uploaded</span>
            </div>
            <v-file-input
              label="Upload profile photo"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              density="compact"
              prepend-icon="mdi-camera"
              show-size
              clearable
              hide-details
              @update:model-value="onPictureSelected"
            />
          </div>
          <PersonDocumentsCard v-if="form.id" :person-id="form.id" />
          </v-form>

          <template v-if="isSystemAdmin">
            <div class="text-subtitle-2 mb-2 mt-2">Organizations</div>
            <v-progress-linear v-if="orgRolesLoading" indeterminate class="mb-2" />

            <v-table v-else-if="orgRoles.length" density="compact" class="border rounded mb-3">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Role</th>
                  <th class="text-right" style="width: 80px">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in orgRoles" :key="row.id">
                  <td>{{ row.organization?.name || row.orgId }}</td>
                  <td>{{ row.role?.roleName || row.roleId }}</td>
                  <td class="text-right">
                    <v-btn
                      type="button"
                      size="small"
                      variant="text"
                      color="error"
                      :disabled="orgRoleBusy"
                      @click="removeOrgRole(row)"
                    >
                      Remove
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <div v-else class="text-body-2 text-medium-emphasis mb-3">No organization assignments.</div>

            <div class="add-role-form pa-4 rounded mb-2">
              <div class="text-subtitle-2 mb-3">Add Role</div>
              <v-select
                v-model="newOrgRole.orgId"
                :items="organizations"
                item-title="name"
                item-value="id"
                label="Organization"
                density="compact"
                :disabled="orgRoleBusy || !organizations.length"
                hide-details
                class="mb-2"
              />
              <v-select
                v-model="newOrgRole.roleId"
                :items="roles"
                item-title="roleName"
                item-value="id"
                label="Role"
                density="compact"
                :disabled="orgRoleBusy"
                hide-details
                class="mb-2"
              />
              <v-btn
                type="button"
                color="primary"
                size="small"
                :loading="orgRoleBusy"
                :disabled="!organizations.length"
                @click="addOrgRole"
              >
                Add role
              </v-btn>
              <div class="text-caption text-medium-emphasis mt-2">
                A person can have multiple roles for the same organization. Assignments save when you click Add role, or when you click Save with an organization and role selected above.
              </div>
            </div>
            <v-alert v-if="orgRoleSuccess" type="success" density="compact" class="mt-2">{{ orgRoleSuccess }}</v-alert>
            <v-alert v-if="orgRoleError" type="error" density="compact" class="mt-2">{{ orgRoleError }}</v-alert>
          </template>
        </template>

        <v-alert v-if="formNotice" type="warning" density="compact" class="mt-2">{{ formNotice }}</v-alert>
        <v-alert v-if="formError" type="error" density="compact" class="mt-2">{{ formError }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn type="button" variant="text" @click="close">Cancel</v-btn>
        <v-btn type="button" color="primary" :loading="saving" :disabled="loading" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="showChangePasswordDialog"
    max-width="440"
    persistent
  >
    <v-card>
      <v-card-title>Change password</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="currentPassword"
          label="Current password"
          type="password"
          density="compact"
          autocomplete="current-password"
        />
        <v-text-field
          v-model="newPassword"
          label="New password"
          type="password"
          density="compact"
          autocomplete="new-password"
          hint="At least 8 characters"
          persistent-hint
        />
        <v-text-field
          v-model="confirmPassword"
          label="Confirm new password"
          type="password"
          density="compact"
          autocomplete="new-password"
        />
        <v-alert v-if="passwordError" type="error" density="compact" class="mt-2">
          {{ passwordError }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn type="button" variant="text" :disabled="passwordSaving" @click="closeChangePasswordDialog">
          Cancel
        </v-btn>
        <v-btn
          type="button"
          color="primary"
          :loading="passwordSaving"
          @click="saveChangePassword"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.add-role-form {
  background-color: #f0f0f0;
}
</style>
