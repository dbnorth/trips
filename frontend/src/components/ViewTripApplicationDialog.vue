<script setup>
import { ref, computed, watch } from "vue";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import {
  tripParticipantStatusLabel,
  tripParticipantStatusColor,
} from "../utils/tripParticipantStatus.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { isUnder18 } from "../utils/personProfile.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  participantId: { type: [Number, String], default: null },
  /** preview | approve | view */
  mode: { type: String, default: "view" },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const loading = ref(false);
const saving = ref(false);
const loadError = ref("");
const actionError = ref("");
const application = ref(null);

const canApprove = computed(
  () => props.mode === "approve" && application.value?.status === "applied"
);
const canManageApproved = computed(
  () => props.mode === "view" && application.value?.status === "approved"
);

const dialogTitle = computed(() => {
  if (props.mode === "approve") return "Approve application";
  if (props.mode === "preview") return "Preview application";
  return "View application";
});

const participantName = computed(() => {
  const p = application.value?.person;
  if (!p) return "Participant";
  return `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Participant";
});

const workerRoleName = computed(
  () => application.value?.tripWorkerRole?.workerRole?.name || "—"
);

const licenseRequired = computed(
  () => !!application.value?.tripWorkerRole?.workerRole?.licenseRequired
);

const under18 = computed(() => isUnder18(application.value?.person?.birthDate));

const selectedTravelOptions = computed(() =>
  (application.value?.travelOptions || []).filter((o) => o.selected)
);

const licenseLabel = (value) => {
  if (value === "yes") return "Yes";
  if (value === "yes_retired") return "Yes, retired";
  if (value === "no") return "No";
  return "—";
};

const formatCost = (value) => (value != null ? formatMoneyDisplay(value) : "—");

const formatAdjustment = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return formatCost(0);
  const formatted = formatCost(Math.abs(amount));
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const yesNo = (value) => (value ? "Yes" : "No");

const load = async () => {
  if (!props.participantId) return;
  loading.value = true;
  loadError.value = "";
  actionError.value = "";
  application.value = null;
  try {
    const res = await TripPeopleRoleServices.get(props.participantId);
    application.value = res.data || null;
  } catch (e) {
    loadError.value = e.response?.data?.message || "Unable to load application.";
  } finally {
    loading.value = false;
  }
};

watch(
  () => [props.modelValue, props.participantId],
  ([open, id]) => {
    if (open && id) load();
    if (!open) {
      application.value = null;
      loadError.value = "";
      actionError.value = "";
    }
  }
);

const close = () => emit("update:modelValue", false);

const updateStatus = async (status, successMessage, failMessage) => {
  if (!application.value?.id) return;
  saving.value = true;
  actionError.value = "";
  try {
    await TripPeopleRoleServices.update(application.value.id, {
      status,
      version: application.value.version,
    });
    emit("saved", { status, message: successMessage });
    close();
  } catch (e) {
    actionError.value = e.response?.data?.message || failMessage;
  } finally {
    saving.value = false;
  }
};

const approve = () => {
  if (!canApprove.value) return;
  return updateStatus("approved", "Application approved.", "Unable to approve application.");
};

const unapprove = () => {
  if (!canManageApproved.value) return;
  return updateStatus("applied", "Application unapproved.", "Unable to unapprove application.");
};

const cancelApplication = () => {
  if (!canManageApproved.value) return;
  return updateStatus("cancelled", "Application cancelled.", "Unable to cancel application.");
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="640" scrollable @update:model-value="(v) => !v && close()">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
        <span>{{ dialogTitle }}</span>
        <v-chip
          v-if="application"
          size="small"
          variant="tonal"
          :color="tripParticipantStatusColor(application.status)"
        >
          {{ tripParticipantStatusLabel(application.status) }}
        </v-chip>
      </v-card-title>

      <v-card-text style="max-height: 75vh">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <v-alert v-else-if="loadError" type="error" density="compact" class="mb-4">
          {{ loadError }}
        </v-alert>

        <template v-else-if="application">
          <div class="text-h6 mb-3">{{ participantName }}</div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Trip role</div>
            <div>{{ application.role?.roleName || "—" }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Worker role</div>
            <div>{{ workerRoleName }}</div>
          </div>

          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Participant cost</div>
            <div>{{ formatCost(application.participantCost) }}</div>
          </div>

          <div class="text-subtitle-2 mb-2 mt-4">Funding</div>
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis">Will self-fund</div>
            <div>{{ yesNo(application.willSelfFund) }}</div>
          </div>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis">Will raise funds</div>
            <div>{{ yesNo(application.willRaiseFunds) }}</div>
          </div>

          <template v-if="licenseRequired">
            <div class="text-subtitle-2 mb-2 mt-4">License</div>
            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">License status</div>
              <div>{{ licenseLabel(application.licenseStatus) }}</div>
            </div>
          </template>

          <div class="text-subtitle-2 mb-2 mt-4">Roommate preference</div>
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis">Has preferred roommate</div>
            <div>{{ yesNo(application.hasPreferredRoommate) }}</div>
          </div>
          <div v-if="application.hasPreferredRoommate" class="mb-3">
            <div class="text-caption text-medium-emphasis">Preferred roommate name(s)</div>
            <div>{{ application.preferredRoommateNames || "—" }}</div>
          </div>

          <div v-if="selectedTravelOptions.length" class="text-subtitle-2 mb-2 mt-4">
            Selected travel options
          </div>
          <div
            v-for="option in selectedTravelOptions"
            :key="option.id"
            class="d-flex justify-space-between ga-3 mb-2"
          >
            <span>
              <span class="text-medium-emphasis">Trip Option {{ option.setNumber }}:</span>
              {{ option.description }}
            </span>
            <span class="text-no-wrap">{{ formatAdjustment(option.priceAdjustment) }}</span>
          </div>

          <div class="text-subtitle-2 mb-2 mt-4">Agreement</div>
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis">Agreed</div>
            <div>{{ yesNo(application.agreementAccepted) }}</div>
          </div>
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis">Signature name</div>
            <div>{{ application.agreementSignatureName || "—" }}</div>
          </div>
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis">Agreement date</div>
            <div>{{ formatDateTime(application.agreementDate) }}</div>
          </div>

          <template v-if="under18 || application.agreementAdultFirstName || application.agreementAdultLastName">
            <div class="text-subtitle-2 mb-2 mt-4">Adult signer</div>
            <div class="mb-2">
              <div class="text-caption text-medium-emphasis">Name</div>
              <div>
                {{
                  [application.agreementAdultFirstName, application.agreementAdultLastName]
                    .filter(Boolean)
                    .join(" ") || "—"
                }}
              </div>
            </div>
            <div class="mb-2">
              <div class="text-caption text-medium-emphasis">Email</div>
              <div>{{ application.agreementAdultEmail || "—" }}</div>
            </div>
            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">Relationship</div>
              <div>{{ application.agreementAdultRelationship || "—" }}</div>
            </div>
          </template>

          <div v-if="application.whygoText" class="mb-3 mt-4">
            <div class="text-caption text-medium-emphasis">Why go</div>
            <div class="text-body-2">{{ application.whygoText }}</div>
          </div>

          <v-alert v-if="actionError" type="error" density="compact" class="mt-3">
            {{ actionError }}
          </v-alert>
        </template>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Close</v-btn>
        <v-btn
          v-if="canManageApproved"
          variant="tonal"
          :disabled="saving"
          @click="unapprove"
        >
          Unapprove
        </v-btn>
        <v-btn
          v-if="canManageApproved"
          color="error"
          variant="tonal"
          :disabled="saving"
          @click="cancelApplication"
        >
          Cancel
        </v-btn>
        <v-btn
          v-if="canApprove"
          color="primary"
          :loading="saving"
          @click="approve"
        >
          Approve App
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
