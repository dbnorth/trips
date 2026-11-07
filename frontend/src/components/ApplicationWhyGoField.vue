<script setup>
import { ref } from "vue";
import TripServices from "../services/tripServices.js";

const WHY_GO_MAX_LENGTH = 2000;

const props = defineProps({
  modelValue: { type: String, default: "" },
  tripId: { type: [String, Number], default: null },
  disabled: { type: Boolean, default: false },
  /** Approved applications keep Why go editable and save it on its own. */
  approved: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const saving = ref(false);
const notice = ref("");
const error = ref("");

const saveWhyGo = async () => {
  notice.value = "";
  error.value = "";
  saving.value = true;
  try {
    const res = await TripServices.updateWhyGo(props.tripId, props.modelValue);
    emit("update:modelValue", res.data?.whygoText || "");
    notice.value = res.data?.message || "Why go saved.";
  } catch (e) {
    error.value = e.response?.data?.message || "Unable to save Why go.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="mb-2" data-testid="application-why-go">
    <v-textarea
      :model-value="modelValue"
      label="Why go"
      density="compact"
      rows="3"
      auto-grow
      :counter="WHY_GO_MAX_LENGTH"
      :maxlength="WHY_GO_MAX_LENGTH"
      hint="Shown on your fundraising page so donors can see why you're going."
      persistent-hint
      :disabled="disabled && !approved"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div v-if="approved" class="d-flex align-center flex-wrap ga-2 mt-2">
      <v-btn
        size="small"
        color="primary"
        :loading="saving"
        data-testid="save-why-go"
        @click="saveWhyGo"
      >
        Save Why go
      </v-btn>
      <span v-if="notice" class="text-body-2 text-success" data-testid="why-go-notice">{{ notice }}</span>
      <span v-if="error" class="text-body-2 text-error" data-testid="why-go-error">{{ error }}</span>
    </div>
  </div>
</template>
