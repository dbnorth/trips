<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "Are you sure?" },
  message: { type: String, default: "" },
  confirmText: { type: String, default: "Yes" },
  cancelText: { type: String, default: "No" },
  confirmColor: { type: String, default: "primary" },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "confirm", "cancel"]);

const open = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const close = () => {
  if (props.loading) return;
  emit("update:modelValue", false);
  emit("cancel");
};

const confirm = () => {
  if (props.loading) return;
  emit("confirm");
};
</script>

<template>
  <v-dialog
    v-model="open"
    max-width="420"
    persistent
    @keydown.esc="close"
  >
    <v-card class="pa-2">
      <v-card-title class="text-wrap">{{ title }}</v-card-title>
      <v-card-text v-if="message" class="pt-0">{{ message }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">{{ cancelText }}</v-btn>
        <v-btn
          :color="confirmColor"
          :loading="loading"
          @click="confirm"
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
