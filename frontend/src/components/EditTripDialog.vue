<script setup>
import { ref, computed, watch } from "vue";
import TripServices from "../services/tripServices.js";
import OrganizationServices from "../services/organizationServices.js";
import WorkerRoleServices from "../services/workerRoleServices.js";
import TripWorkerRoleServices from "../services/tripWorkerRoleServices.js";
import TripTravelOptionServices from "../services/tripTravelOptionServices.js";
import Utils from "../config/utils.js";
import { useVersionConflictForm } from "../utils/useVersionConflictForm.js";
import { useTripLeaderPicker } from "../utils/useTripLeaderPicker.js";
import MoneyInput from "./MoneyInput.vue";
import CountrySelect from "./CountrySelect.vue";
import { parseMoneyAmount, formatMoneyDisplay } from "../utils/moneyUtils.js";
import { resolveCountryCode } from "../utils/locationData.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  tripId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const STATUS_OPTIONS = ["active", "completed", "inactive"];

const user = ref(null);
const organizations = ref([]);
const loading = ref(false);
const saving = ref(false);
const { formError, formNotice, prepareSave, onLoadStart, onLoadSuccess, handleSaveError } =
  useVersionConflictForm();

const emptyForm = () => ({
  id: null,
  orgId: null,
  name: "",
  status: "active",
  location: "",
  city: "",
  country: "",
  description: "",
  startDate: "",
  endDate: "",
  facebookPage: "",
  instagramId: "",
  participantCost: "",
  image: null,
  version: 0,
  organization: null,
});

const form = ref(emptyForm());
const imageFile = ref(null);
const imagePreview = ref(null);

const workerRoles = ref([]);
const workerRolesLoading = ref(false);
const selectedRoles = ref([]);
const initialRoleIds = ref([]);
const addRoleId = ref(null);
const addQuantity = ref(1);
const rolesError = ref("");

const travelOptions = ref([]);
const initialTravelOptionIds = ref([]);
const addTravelDescription = ref("");
const addTravelPriceAdjustment = ref("");
const addTravelSetNumber = ref(1);
const travelOptionsError = ref("");
let travelOptionTempId = 0;

const currentImageUrl = computed(() => TripServices.getImageUrl(form.value.image));

const clearImageSelection = () => {
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = null;
  imagePreview.value = null;
};

const onImageSelected = (files) => {
  const file = Array.isArray(files) ? files[0] : files;
  if (imagePreview.value) URL.revokeObjectURL(imagePreview.value);
  imageFile.value = file || null;
  imagePreview.value = file ? URL.createObjectURL(file) : null;
};

const {
  leaderPeopleIds,
  leaderOptions,
  leadersLoading,
  leadersError,
  personLabel,
  loadLeaderOptions,
  setLeadersFromTrip,
  resetLeaders,
} = useTripLeaderPicker();

const isSystemAdmin = computed(() => Utils.isSystemAdmin(user.value));

const orgAdminOrgs = computed(() => Utils.getOrgAdminOrgs(user.value));

const orgAdminOrgItems = computed(() =>
  orgAdminOrgs.value.map((r) => ({ title: r.orgName, value: r.orgId }))
);

const orgDisplayName = computed(() => {
  if (form.value.organization?.name) return form.value.organization.name;
  const org = orgAdminOrgs.value.find((r) => Number(r.orgId) === Number(form.value.orgId));
  if (org?.orgName) return org.orgName;
  if (form.value.orgId) {
    return Utils.orgDisplayName(user.value, form.value.orgId) || "";
  }
  return organizations.value.find((o) => o.id === form.value.orgId)?.name || "";
});

const availableRoleItems = computed(() => {
  const usedIds = new Set(selectedRoles.value.map((r) => Number(r.workerRoleId)));
  return workerRoles.value
    .filter((r) => !usedIds.has(Number(r.id)))
    .map((r) => ({
      title: r.licenseRequired
        ? `${r.name} (${r.documentType?.description ? r.documentType.description + " " : ""}license required)`
        : r.name,
      value: r.id,
    }));
});

const totalRolesNeeded = computed(() =>
  selectedRoles.value.reduce((sum, r) => sum + Number(r.quantity || 0), 0)
);

const resetRoles = () => {
  selectedRoles.value = [];
  initialRoleIds.value = [];
  addRoleId.value = null;
  addQuantity.value = 1;
  rolesError.value = "";
  workerRoles.value = [];
};

const resetTravelOptions = () => {
  travelOptions.value = [];
  initialTravelOptionIds.value = [];
  addTravelDescription.value = "";
  addTravelPriceAdjustment.value = "";
  addTravelSetNumber.value = 1;
  travelOptionsError.value = "";
};

const mapTripRoleRow = (row) => ({
  id: row.id,
  workerRoleId: row.workerRoleId,
  name: row.workerRole?.name || "—",
  description: row.workerRole?.description || "",
  licenseRequired: !!row.workerRole?.licenseRequired,
  documentTypeDescription: row.workerRole?.documentType?.description || "",
  quantity: Number(row.quantity) || 1,
  originalQuantity: Number(row.quantity) || 1,
});

const loadWorkerRoles = async (orgId) => {
  if (!orgId) {
    workerRoles.value = [];
    return;
  }
  workerRolesLoading.value = true;
  rolesError.value = "";
  try {
    const res = await WorkerRoleServices.getAll({ orgId, status: "active" });
    workerRoles.value = res.data || [];
  } catch (e) {
    workerRoles.value = [];
    rolesError.value = e.response?.data?.message || "Unable to load worker roles.";
  } finally {
    workerRolesLoading.value = false;
  }
};

const loadTripRoles = async (tripId) => {
  const res = await TripWorkerRoleServices.getAll(tripId);
  const rows = (res.data || []).map(mapTripRoleRow);
  selectedRoles.value = rows;
  initialRoleIds.value = rows.map((r) => r.id);
};

const addSelectedRole = () => {
  if (!addRoleId.value) return;
  const qty = Number(addQuantity.value);
  if (!Number.isInteger(qty) || qty < 1) {
    rolesError.value = "Quantity must be a positive whole number.";
    return;
  }
  const role = workerRoles.value.find((r) => Number(r.id) === Number(addRoleId.value));
  if (!role) return;
  if (selectedRoles.value.some((r) => Number(r.workerRoleId) === Number(role.id))) {
    rolesError.value = "That role is already selected.";
    return;
  }
  rolesError.value = "";
  selectedRoles.value.push({
    id: null,
    workerRoleId: role.id,
    name: role.name,
    description: role.description || "",
    licenseRequired: !!role.licenseRequired,
    documentTypeDescription: role.documentType?.description || "",
    quantity: qty,
    originalQuantity: null,
  });
  addRoleId.value = null;
  addQuantity.value = 1;
};

const removeSelectedRole = (workerRoleId) => {
  selectedRoles.value = selectedRoles.value.filter(
    (r) => Number(r.workerRoleId) !== Number(workerRoleId)
  );
};

const syncTripRoles = async (tripId) => {
  const currentIds = new Set(
    selectedRoles.value.filter((r) => r.id != null).map((r) => Number(r.id))
  );
  const toDelete = initialRoleIds.value.filter((id) => !currentIds.has(Number(id)));

  await Promise.all([
    ...toDelete.map((id) => TripWorkerRoleServices.delete(id)),
    ...selectedRoles.value
      .filter((r) => r.id == null)
      .map((r) =>
        TripWorkerRoleServices.create({
          tripId: Number(tripId),
          workerRoleId: Number(r.workerRoleId),
          quantity: Number(r.quantity),
        })
      ),
    ...selectedRoles.value
      .filter(
        (r) =>
          r.id != null && Number(r.quantity) !== Number(r.originalQuantity)
      )
      .map((r) =>
        TripWorkerRoleServices.update(r.id, { quantity: Number(r.quantity) })
      ),
  ]);
};

const mapTravelOptionRow = (row) => ({
  id: row.id,
  localKey: row.id != null ? `saved-${row.id}` : `new-${++travelOptionTempId}`,
  description: row.description || "",
  priceAdjustment:
    row.priceAdjustment != null && row.priceAdjustment !== ""
      ? String(row.priceAdjustment)
      : "0",
  setNumber: Number(row.setNumber) > 0 ? Number(row.setNumber) : 1,
  originalDescription: row.description || "",
  originalPriceAdjustment:
    row.priceAdjustment != null ? Number(row.priceAdjustment) : 0,
  originalSetNumber: Number(row.setNumber) > 0 ? Number(row.setNumber) : 1,
});

const loadTravelOptions = async (tripId) => {
  const res = await TripTravelOptionServices.getAll(tripId);
  const rows = (res.data || []).map(mapTravelOptionRow);
  travelOptions.value = rows;
  initialTravelOptionIds.value = rows.filter((r) => r.id != null).map((r) => r.id);
};

const addTravelOption = () => {
  const description = addTravelDescription.value.trim();
  if (!description) {
    travelOptionsError.value = "Enter a travel option description.";
    return;
  }
  const priceAdjustment = parseMoneyAmount(addTravelPriceAdjustment.value, {
    allowNegative: true,
  });
  if (priceAdjustment == null) {
    travelOptionsError.value = "Enter a valid price adjustment amount.";
    return;
  }
  const setNumber = Number(addTravelSetNumber.value);
  if (!Number.isInteger(setNumber) || setNumber < 1) {
    travelOptionsError.value = "Set number must be a positive whole number.";
    return;
  }
  travelOptionsError.value = "";
  travelOptions.value.push({
    id: null,
    localKey: `new-${++travelOptionTempId}`,
    description,
    priceAdjustment: String(priceAdjustment),
    setNumber,
    originalDescription: null,
    originalPriceAdjustment: null,
    originalSetNumber: null,
  });
  addTravelDescription.value = "";
  addTravelPriceAdjustment.value = "";
  addTravelSetNumber.value = 1;
};

const removeTravelOption = (localKey) => {
  travelOptions.value = travelOptions.value.filter((r) => r.localKey !== localKey);
};

const formatAdjustment = (value) =>
  formatMoneyDisplay(value, { allowNegative: true }) || "$0.00";

const syncTripTravelOptions = async (tripId) => {
  const currentIds = new Set(
    travelOptions.value.filter((r) => r.id != null).map((r) => Number(r.id))
  );
  const toDelete = initialTravelOptionIds.value.filter((id) => !currentIds.has(Number(id)));

  await Promise.all([
    ...toDelete.map((id) => TripTravelOptionServices.delete(id)),
    ...travelOptions.value
      .filter((r) => r.id == null)
      .map((r) =>
        TripTravelOptionServices.create({
          tripId: Number(tripId),
          description: r.description.trim(),
          priceAdjustment: parseMoneyAmount(r.priceAdjustment, { allowNegative: true }),
          setNumber: Number(r.setNumber),
        })
      ),
    ...travelOptions.value
      .filter((r) => {
        if (r.id == null) return false;
        const amount = parseMoneyAmount(r.priceAdjustment, { allowNegative: true });
        return (
          r.description.trim() !== (r.originalDescription || "") ||
          Number(amount) !== Number(r.originalPriceAdjustment) ||
          Number(r.setNumber) !== Number(r.originalSetNumber)
        );
      })
      .map((r) =>
        TripTravelOptionServices.update(r.id, {
          description: r.description.trim(),
          priceAdjustment: parseMoneyAmount(r.priceAdjustment, { allowNegative: true }),
          setNumber: Number(r.setNumber),
        })
      ),
  ]);
};

const applyTripData = (data) => {
  form.value = {
    ...emptyForm(),
    ...data,
    country: resolveCountryCode(data.country),
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    participantCost: data.participantCost != null ? String(data.participantCost) : "",
  };
  clearImageSelection();
};

const loadTrip = async ({ afterConflict = false } = {}) => {
  if (!props.tripId) return;
  user.value = Utils.getStore("user");
  loading.value = true;
  onLoadStart({ afterConflict });
  resetRoles();
  resetTravelOptions();

  try {
    if (isSystemAdmin.value) {
      const orgRes = await OrganizationServices.getAll();
      organizations.value = orgRes.data || [];
    }
    const res = await TripServices.get(props.tripId);
    applyTripData(res.data || {});
    setLeadersFromTrip(res.data?.leaderPeopleIds || []);
    await Promise.all([
      loadLeaderOptions(form.value.orgId),
      loadWorkerRoles(form.value.orgId),
      loadTripRoles(props.tripId),
      loadTravelOptions(props.tripId),
    ]);
    onLoadSuccess({ afterConflict });
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load trip.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.tripId],
  ([open, id]) => {
    if (open && id) loadTrip();
    if (!open) {
      resetLeaders();
      resetRoles();
      resetTravelOptions();
      clearImageSelection();
    }
  }
);

watch(
  () => form.value.orgId,
  (orgId, prevOrgId) => {
    if (!props.modelValue || loading.value || prevOrgId == null) return;
    loadLeaderOptions(orgId);
    selectedRoles.value = [];
    addRoleId.value = null;
    addQuantity.value = 1;
    loadWorkerRoles(orgId);
  }
);

const close = () => {
  clearImageSelection();
  emit("update:modelValue", false);
};

const save = async () => {
  if (!form.value.name?.trim()) {
    formError.value = "Trip name is required.";
    return;
  }
  if (!form.value.orgId) {
    formError.value = "Organization is required.";
    return;
  }
  for (const row of selectedRoles.value) {
    const qty = Number(row.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      formError.value = "Each team role needs a positive whole number.";
      return;
    }
  }
  for (const row of travelOptions.value) {
    if (!row.description?.trim()) {
      formError.value = "Each travel option needs a description.";
      return;
    }
    if (parseMoneyAmount(row.priceAdjustment, { allowNegative: true }) == null) {
      formError.value = "Each travel option needs a valid price adjustment.";
      return;
    }
    const setNumber = Number(row.setNumber);
    if (!Number.isInteger(setNumber) || setNumber < 1) {
      formError.value = "Each travel option needs a positive set number.";
      return;
    }
  }

  saving.value = true;
  prepareSave();

  const payload = {
    orgId: form.value.orgId,
    name: form.value.name.trim(),
    status: form.value.status,
    location: form.value.location?.trim() || null,
    city: form.value.city?.trim() || null,
    country: resolveCountryCode(form.value.country) || null,
    description: form.value.description?.trim() || null,
    startDate: form.value.startDate || null,
    endDate: form.value.endDate || null,
    facebookPage: form.value.facebookPage?.trim() || null,
    instagramId: form.value.instagramId?.trim() || null,
    participantCost: parseMoneyAmount(form.value.participantCost),
    version: form.value.version,
    leaderPeopleIds: leaderPeopleIds.value,
  };

  try {
    await TripServices.update(form.value.id, payload);
    if (imageFile.value) {
      await TripServices.uploadImage(form.value.id, imageFile.value);
    }
    try {
      await syncTripRoles(form.value.id);
    } catch (roleErr) {
      formError.value =
        roleErr.response?.data?.message ||
        "Trip was saved, but some team roles could not be updated. You can edit them on the trip page.";
      emit("saved");
      return;
    }
    try {
      await syncTripTravelOptions(form.value.id);
    } catch (travelErr) {
      formError.value =
        travelErr.response?.data?.message ||
        "Trip was saved, but some travel options could not be updated.";
      emit("saved");
      return;
    }
    emit("saved");
    close();
  } catch (e) {
    await handleSaveError(e, loadTrip, "Error saving trip.");
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title>Edit trip</v-card-title>

      <v-card-text style="max-height: 70vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <template v-if="!loading">
          <v-text-field v-model="form.name" label="Name" density="compact" autocomplete="off" />

          <v-select
            v-model="form.status"
            :items="STATUS_OPTIONS"
            label="Status"
            density="compact"
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
              :model-value="orgDisplayName"
              label="Organization"
              density="compact"
              readonly
            />
          </template>

          <v-text-field v-model="form.location" label="Location" density="compact" autocomplete="off" />
          <v-text-field v-model="form.city" label="City" density="compact" autocomplete="off" />
          <CountrySelect v-model="form.country" />

          <v-row dense>
            <v-col cols="6">
              <v-text-field v-model="form.startDate" label="Start date" type="date" density="compact" />
            </v-col>
            <v-col cols="6">
              <v-text-field v-model="form.endDate" label="End date" type="date" density="compact" />
            </v-col>
          </v-row>

          <MoneyInput v-model="form.participantCost" label="Participant cost" class="mb-2" />

          <v-textarea
            v-model="form.description"
            label="Description"
            density="compact"
            rows="3"
            auto-grow
          />

          <v-text-field
            v-model="form.facebookPage"
            label="Facebook page URL"
            density="compact"
            autocomplete="off"
          />
          <v-text-field
            v-model="form.instagramId"
            label="Instagram ID"
            density="compact"
            autocomplete="off"
          />

          <div class="mt-2 mb-2">
            <div class="text-subtitle-2 mb-2">Trip image</div>
            <div class="d-flex align-center ga-3 mb-2">
              <v-img
                v-if="imagePreview || currentImageUrl"
                :src="imagePreview || currentImageUrl"
                alt="Trip image"
                max-width="160"
                max-height="100"
                cover
              />
              <span v-else class="text-caption text-medium-emphasis">No image uploaded</span>
            </div>
            <v-file-input
              label="Upload trip image"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              density="compact"
              prepend-icon="mdi-camera"
              show-size
              clearable
              hide-details
              @update:model-value="onImageSelected"
            />
          </div>

          <v-autocomplete
            v-model="leaderPeopleIds"
            :items="leaderOptions"
            :item-title="personLabel"
            item-value="id"
            label="Trip leaders"
            density="compact"
            multiple
            chips
            closable-chips
            clearable
            :loading="leadersLoading"
            :disabled="!form.orgId"
            :hint="
              !form.orgId
                ? 'Select an organization first'
                : leaderOptions.length
                  ? 'People with the Trip Leader role for this organization'
                  : 'No Trip Leaders are assigned to this organization yet'
            "
            persistent-hint
            class="mt-2"
          />

          <div class="mt-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="text-subtitle-2">Team roles needed</div>
              <span v-if="selectedRoles.length" class="text-caption text-medium-emphasis">
                {{ totalRolesNeeded }} needed
              </span>
            </div>

            <v-progress-linear v-if="workerRolesLoading" indeterminate class="mb-3" />

            <v-table v-if="selectedRoles.length" density="compact" class="mb-3">
              <thead>
                <tr>
                  <th>Role</th>
                  <th style="width: 130px">Number Needed</th>
                  <th style="width: 90px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedRoles" :key="row.id || `new-${row.workerRoleId}`">
                  <td>
                    <div>
                      {{ row.name }}
                      <span v-if="row.licenseRequired" class="text-caption text-medium-emphasis">
                        ({{ row.documentTypeDescription ? row.documentTypeDescription + " · " : "" }}license required)
                      </span>
                    </div>
                    <div v-if="row.description" class="text-caption text-medium-emphasis">
                      {{ row.description }}
                    </div>
                  </td>
                  <td>
                    <v-text-field
                      v-model.number="row.quantity"
                      type="number"
                      min="1"
                      density="compact"
                      hide-details
                    />
                  </td>
                  <td>
                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeSelectedRole(row.workerRoleId)"
                    >
                      Remove
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <p v-else class="text-body-2 text-medium-emphasis mb-3">
              Optional — add staffing roles for this trip.
            </p>

            <div class="add-role-form pa-4 rounded mb-2">
              <div class="text-subtitle-2 mb-3">Add Role</div>
              <div class="d-flex align-center ga-3 flex-wrap">
                <v-select
                  v-model="addRoleId"
                  :items="availableRoleItems"
                  label="Worker role"
                  density="compact"
                  hide-details
                  style="max-width: 280px; min-width: 180px"
                  :disabled="!form.orgId || !availableRoleItems.length"
                  :placeholder="
                    !form.orgId
                      ? 'Select an organization first'
                      : availableRoleItems.length
                        ? undefined
                        : 'No more active roles to add'
                  "
                />
                <v-text-field
                  v-model.number="addQuantity"
                  type="number"
                  min="1"
                  label="Number Needed"
                  density="compact"
                  hide-details
                  style="max-width: 120px"
                  :disabled="!form.orgId"
                />
                <v-btn
                  color="primary"
                  size="small"
                  :disabled="!addRoleId"
                  @click="addSelectedRole"
                >
                  Add role
                </v-btn>
              </div>
            </div>

            <v-alert v-if="rolesError" type="error" density="compact" class="mt-2">
              {{ rolesError }}
            </v-alert>
          </div>

          <div class="mt-4">
            <div class="text-subtitle-2 mb-2">Travel options</div>

            <v-table v-if="travelOptions.length" density="compact" class="mb-3">
              <thead>
                <tr>
                  <th style="width: 100px">Set #</th>
                  <th>Description</th>
                  <th style="width: 160px">Price adjustment</th>
                  <th style="width: 90px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in travelOptions" :key="row.localKey">
                  <td>
                    <v-text-field
                      v-model.number="row.setNumber"
                      type="number"
                      min="1"
                      density="compact"
                      hide-details
                    />
                  </td>
                  <td>
                    <v-text-field
                      v-model="row.description"
                      density="compact"
                      hide-details
                      autocomplete="off"
                    />
                  </td>
                  <td>
                    <MoneyInput
                      v-model="row.priceAdjustment"
                      label=""
                      allow-negative
                      hide-details
                    />
                  </td>
                  <td>
                    <v-btn
                      size="small"
                      variant="text"
                      color="error"
                      @click="removeTravelOption(row.localKey)"
                    >
                      Remove
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <p v-else class="text-body-2 text-medium-emphasis mb-3">
              Optional — add travel options that adjust the trip price.
            </p>

            <div class="add-role-form pa-4 rounded mb-2">
              <div class="text-subtitle-2 mb-3">Add travel option</div>
              <div class="d-flex align-center ga-3 flex-wrap">
                <v-text-field
                  v-model.number="addTravelSetNumber"
                  type="number"
                  min="1"
                  label="Set #"
                  density="compact"
                  hide-details
                  style="max-width: 100px"
                />
                <v-text-field
                  v-model="addTravelDescription"
                  label="Description"
                  density="compact"
                  hide-details
                  autocomplete="off"
                  style="min-width: 220px; flex: 1"
                />
                <MoneyInput
                  v-model="addTravelPriceAdjustment"
                  label="Price adjustment"
                  allow-negative
                  hide-details
                  style="max-width: 160px"
                />
                <v-btn
                  color="primary"
                  size="small"
                  :disabled="!addTravelDescription.trim()"
                  @click="addTravelOption"
                >
                  Add option
                </v-btn>
              </div>
              <div class="text-caption text-medium-emphasis mt-2">
                Options with the same set number belong together. Use a positive amount to
                increase cost, or negative to decrease (e.g. {{ formatAdjustment(-50) }}).
              </div>
            </div>

            <v-alert v-if="travelOptionsError" type="error" density="compact" class="mt-2">
              {{ travelOptionsError }}
            </v-alert>
          </div>

          <v-alert v-if="leadersError" type="error" density="compact" class="mt-2">{{ leadersError }}</v-alert>
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
  </v-dialog>
</template>

<style scoped>
.add-role-form {
  background-color: #f0f0f0;
}
</style>
