<script setup>
import { ref, computed, watch } from "vue";
import TripPeopleRoleServices from "../services/tripPeopleRoleServices.js";
import {
  tripParticipantStatusLabel,
  tripParticipantStatusColor,
} from "../utils/tripParticipantStatus.js";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { isUnder18, personDisplayName } from "../utils/personProfile.js";
import ConfirmDialog from "./ConfirmDialog.vue";
import LabelValueTable from "./LabelValueTable.vue";
import LabelValueRow from "./LabelValueRow.vue";

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
const showConfirmCancel = ref(false);
const showConfirmUncancel = ref(false);

const canApprove = computed(
  () => props.mode === "approve" && application.value?.status === "applied"
);
const canManageApproved = computed(
  () => props.mode === "view" && application.value?.status === "approved"
);
const canCancelApplication = computed(
  () =>
    props.mode !== "preview" &&
    ["incomplete", "applied", "approved"].includes(
      String(application.value?.status || "").toLowerCase()
    )
);
const canUncancelApplication = computed(
  () => String(application.value?.status || "").toLowerCase() === "cancelled"
);

const dialogTitle = computed(() => {
  if (props.mode === "approve") return "Approve application";
  if (props.mode === "preview") return "Preview application";
  return "View application";
});

const participantName = computed(() =>
  personDisplayName(application.value?.person, "Participant")
);

const workerRoleName = computed(
  () => application.value?.tripWorkerRole?.workerRole?.name || "—"
);

const under18 = computed(() => isUnder18(application.value?.person?.birthDate));

const selectedTravelOptions = computed(() => {
  const options = application.value?.travelOptions;
  if (!Array.isArray(options)) return [];
  return options.filter((o) => o && o.selected);
});

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
  if (!canCancelApplication.value || !application.value?.id) return;
  showConfirmCancel.value = true;
};

const confirmCancelApplication = async () => {
  if (!application.value?.id) return;
  saving.value = true;
  actionError.value = "";
  try {
    await TripPeopleRoleServices.cancel(application.value.id);
    showConfirmCancel.value = false;
    emit("saved", { status: "cancelled", message: "Application cancelled." });
    close();
  } catch (e) {
    actionError.value = e.response?.data?.message || "Unable to cancel application.";
    showConfirmCancel.value = false;
  } finally {
    saving.value = false;
  }
};

const uncancelApplication = () => {
  if (!canUncancelApplication.value || !application.value?.id) return;
  showConfirmUncancel.value = true;
};

const confirmUncancelApplication = async () => {
  if (!application.value?.id) return;
  saving.value = true;
  actionError.value = "";
  try {
    const res = await TripPeopleRoleServices.uncancel(application.value.id);
    const status = res.data?.status || "incomplete";
    showConfirmUncancel.value = false;
    emit("saved", { status, message: "Application uncancelled." });
    close();
  } catch (e) {
    actionError.value = e.response?.data?.message || "Unable to uncancel application.";
    showConfirmUncancel.value = false;
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="640"
    max-height="90vh"
    scrollable
    @update:model-value="(v) => !v && close()"
  >
    <v-card class="d-flex flex-column" style="max-height: min(90vh, 900px)">
      <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2 flex-shrink-0">
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

      <v-card-text class="overflow-y-auto flex-grow-1">
        <v-progress-linear v-if="loading" indeterminate class="mb-4" />

        <v-alert v-else-if="loadError" type="error" density="compact" class="mb-4">
          {{ loadError }}
        </v-alert>

        <template v-else-if="application">
          <div class="text-h6 mb-3">{{ participantName }}</div>

          <LabelValueTable>
            <LabelValueRow label="Trip role">{{ application.role?.roleName || "—" }}</LabelValueRow>
            <LabelValueRow label="Worker role">{{ workerRoleName }}</LabelValueRow>
            <LabelValueRow label="Participant cost">
              {{ formatCost(application.participantCost) }}
            </LabelValueRow>
          </LabelValueTable>

          <div class="text-subtitle-2 mb-2 mt-4">Funding</div>
          <LabelValueTable>
            <LabelValueRow label="Will self-fund">{{ yesNo(application.willSelfFund) }}</LabelValueRow>
            <LabelValueRow label="Will raise funds">{{ yesNo(application.willRaiseFunds) }}</LabelValueRow>
          </LabelValueTable>

          <div class="text-subtitle-2 mb-2 mt-4">Roommate preference</div>
          <LabelValueTable>
            <LabelValueRow label="Has preferred roommate">
              {{ yesNo(application.hasPreferredRoommate) }}
            </LabelValueRow>
            <LabelValueRow v-if="application.hasPreferredRoommate" label="Preferred roommate name(s)">
              {{ application.preferredRoommateNames || "—" }}
            </LabelValueRow>
          </LabelValueTable>

          <div class="text-subtitle-2 mb-2 mt-4">Flight purchase</div>
          <LabelValueTable>
            <LabelValueRow label="Option">
              {{
                application.flightPurchaseOption === "self"
                  ? "Arrange for and purchase my own air travel"
                  : application.flightPurchaseOption === "organization"
                    ? "Organization arranges and purchases air travel"
                    : "—"
              }}
            </LabelValueRow>
            <template v-if="application.flightPurchaseOption === 'organization'">
              <LabelValueRow label="Preferred departure airport">
                {{
                  application.preferredDepartureAirport?.code ||
                  application.preferredDepartureAirportCode ||
                  "—"
                }}
              </LabelValueRow>
              <LabelValueRow label="Preferred return airport">
                {{
                  application.preferredReturnAirport?.code ||
                  application.preferredReturnAirportCode ||
                  "—"
                }}
              </LabelValueRow>
              <LabelValueRow label="Class of travel">
                {{ application.preferredCabinClass || "—" }}
              </LabelValueRow>
              <LabelValueRow label="Refundable ticket">
                {{
                  application.preferredRefundableTicket === true
                    ? "Yes"
                    : application.preferredRefundableTicket === false
                      ? "No"
                      : "—"
                }}
              </LabelValueRow>
              <LabelValueRow label="Preferred airline">
                {{
                  application.preferredAirline?.code ||
                  application.preferredAirlineCode ||
                  "—"
                }}
              </LabelValueRow>
            </template>
            <LabelValueRow label="Flight notes">
              <span class="text-pre-wrap">{{ application.flightNotes || "—" }}</span>
            </LabelValueRow>
          </LabelValueTable>

          <div class="text-subtitle-2 mb-2 mt-4">Selected travel options</div>
          <div v-if="!selectedTravelOptions.length" class="mb-3 text-medium-emphasis">
            None selected
          </div>
          <LabelValueTable v-else>
            <LabelValueRow
              v-for="option in selectedTravelOptions"
              :key="option.id"
              :label="`Trip Option ${option.setNumber}`"
            >
              {{ option.description }}
              <span class="text-no-wrap">{{ formatAdjustment(option.priceAdjustment) }}</span>
            </LabelValueRow>
          </LabelValueTable>

          <div class="text-subtitle-2 mb-2 mt-4">Agreement</div>
          <LabelValueTable>
            <LabelValueRow label="Participation agreed">
              {{ yesNo(application.agreementAccepted) }}
            </LabelValueRow>
            <LabelValueRow label="Signature name">
              {{ application.agreementSignatureName || "—" }}
            </LabelValueRow>
            <LabelValueRow label="Agreement date">
              {{ formatDateTime(application.agreementDate) }}
            </LabelValueRow>
            <template
              v-if="
                application.person?.takesMedication === true ||
                application.person?.takesMedication === 1 ||
                application.medicalAgreementAccepted
              "
            >
              <LabelValueRow label="Medical agreement agreed">
                {{ yesNo(application.medicalAgreementAccepted) }}
              </LabelValueRow>
              <LabelValueRow label="Medical agreement date">
                {{ formatDateTime(application.medicalAgreementDate) }}
              </LabelValueRow>
            </template>
          </LabelValueTable>

          <template v-if="application.person?.gender === 'female'">
            <div class="text-subtitle-2 mb-2 mt-4">Pregnancy</div>
            <LabelValueTable>
              <LabelValueRow label="Are you pregnant?">{{ yesNo(application.isPregnant) }}</LabelValueRow>
              <LabelValueRow
                v-if="application.isPregnant === true || application.isPregnant === 1"
                label="Due date"
              >
                {{ application.pregnancyDueDate || "—" }}
              </LabelValueRow>
            </LabelValueTable>
          </template>

          <template v-if="under18 || application.agreementAdultFirstName || application.agreementAdultLastName">
            <div class="text-subtitle-2 mb-2 mt-4">Adult signer</div>
            <LabelValueTable>
              <LabelValueRow label="Name">
                {{
                  [application.agreementAdultFirstName, application.agreementAdultLastName]
                    .filter(Boolean)
                    .join(" ") || "—"
                }}
              </LabelValueRow>
              <LabelValueRow label="Email">{{ application.agreementAdultEmail || "—" }}</LabelValueRow>
              <LabelValueRow label="Relationship">
                {{ application.agreementAdultRelationship || "—" }}
              </LabelValueRow>
            </LabelValueTable>
          </template>

          <LabelValueTable v-if="application.whygoText" class="mt-4">
            <LabelValueRow label="Why go">{{ application.whygoText }}</LabelValueRow>
          </LabelValueTable>

          <v-alert v-if="actionError" type="error" density="compact" class="mt-3">
            {{ actionError }}
          </v-alert>
        </template>
      </v-card-text>

      <v-card-actions class="flex-shrink-0">
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
          v-if="canCancelApplication"
          color="error"
          variant="tonal"
          :disabled="saving"
          @click="cancelApplication"
        >
          Cancel
        </v-btn>
        <v-btn
          v-if="canUncancelApplication"
          color="primary"
          variant="tonal"
          :disabled="saving"
          @click="uncancelApplication"
        >
          Uncancel
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

  <ConfirmDialog
    v-model="showConfirmCancel"
    title="Are you sure?"
    message="Cancel this application? The role slot will be freed."
    confirm-text="Cancel App"
    confirm-color="error"
    :loading="saving"
    @confirm="confirmCancelApplication"
  />
  <ConfirmDialog
    v-model="showConfirmUncancel"
    title="Are you sure?"
    message="Uncancel this application? It will return to incomplete or applied based on completeness."
    confirm-text="Uncancel"
    :loading="saving"
    @confirm="confirmUncancelApplication"
  />
</template>
