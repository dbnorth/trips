<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sending: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  result: { type: Object, default: null },
  error: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue", "ok"]);

const emailLabel = (count) => `${count} email${count === 1 ? "" : "s"}`;

const allSent = computed(
  () => !props.error && !!props.result && props.result.skipped === 0 && props.result.failed === 0
);

const attempted = computed(() =>
  props.result ? props.result.sent + props.result.skipped + props.result.failed : 0
);

const notSent = computed(() => (props.result?.results || []).filter((row) => row.status !== "sent"));

const title = computed(() => {
  if (props.sending) return "Sending email";
  if (props.error) return "Email not sent";
  return allSent.value ? "Emails sent" : "Some emails not sent";
});

const header = computed(() => {
  if (props.error) return { icon: "mdi-alert-circle", color: "error" };
  if (allSent.value) return { icon: "mdi-check-circle", color: "success" };
  return { icon: "mdi-alert", color: "warning" };
});

const subtitle = computed(() => {
  if (props.sending) return `Sending ${emailLabel(props.count)}…`;
  if (props.error || !props.result) return "";
  return `${props.result.sent} of ${emailLabel(attempted.value)} sent`;
});

const stats = computed(() => {
  const r = props.result || { sent: 0, skipped: 0, failed: 0 };
  return [
    { key: "attempted", label: "Attempted", value: attempted.value, color: "primary" },
    { key: "sent", label: "Sent", value: r.sent, color: "success" },
    { key: "skipped", label: "Skipped", value: r.skipped, color: r.skipped ? "warning" : undefined },
    { key: "failed", label: "Failed", value: r.failed, color: r.failed ? "error" : undefined },
  ];
});

const rowIcon = (row) =>
  row.status === "failed"
    ? { icon: "mdi-close-circle", color: "error" }
    : { icon: "mdi-account-cancel", color: "warning" };

const ok = () => {
  emit("update:modelValue", false);
  emit("ok", { allSent: allSent.value });
};
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" persistent>
    <v-card rounded="lg" class="pa-2" data-testid="email-send-status">
      <v-card-item>
        <template #prepend>
          <v-progress-circular v-if="sending" indeterminate color="primary" size="32" width="3" class="mr-2" />
          <v-icon v-else :icon="header.icon" :color="header.color" size="36" class="mr-2" />
        </template>
        <v-card-title class="text-wrap">{{ title }}</v-card-title>
        <v-card-subtitle v-if="subtitle" class="text-wrap">{{ subtitle }}</v-card-subtitle>
      </v-card-item>

      <v-card-text v-if="!sending" class="pt-2">
        <v-alert v-if="error" type="error" variant="tonal" density="compact">{{ error }}</v-alert>
        <template v-else-if="result">
          <v-row density="comfortable" class="mb-1">
            <v-col v-for="stat in stats" :key="stat.key" cols="3">
              <v-sheet
                rounded="lg"
                border
                class="pa-2 text-center"
                :data-testid="`email-status-${stat.key}`"
              >
                <div class="text-h5 font-weight-bold" :class="stat.color ? `text-${stat.color}` : ''">
                  {{ stat.value }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </v-sheet>
            </v-col>
          </v-row>
          <v-sheet v-if="notSent.length" rounded="lg" border class="mt-3">
            <div class="text-subtitle-2 px-4 pt-3">Not sent</div>
            <v-list density="compact" class="py-1">
              <v-list-item
                v-for="row in notSent"
                :key="row.personId"
                :prepend-icon="rowIcon(row).icon"
                :base-color="rowIcon(row).color"
              >
                <v-list-item-title class="text-wrap text-body-2 text-high-emphasis">
                  {{ row.name || "Participant" }}: {{ row.status }} — {{ row.reason }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-sheet>
        </template>
      </v-card-text>

      <v-card-actions v-if="!sending">
        <v-spacer />
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="ok">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
