<script setup>
import { ref, computed, watch } from "vue";
import EmailTokenServices from "../services/emailTokenServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  emailTokenId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const TOKEN_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const saving = ref(false);
const formError = ref("");
const valueSources = ref([]);

const emptyForm = () => ({
  tokenCode: "",
  description: "",
  valueSource: null,
});

const form = ref(emptyForm());

const isEdit = computed(() => props.emailTokenId != null && props.emailTokenId !== "");
const title = computed(() => (isEdit.value ? "Edit token" : "Add token"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const valueSourceItems = computed(() =>
  valueSources.value.map((row) => ({ title: row.label, value: row.valueSource }))
);

const loadValueSources = async () => {
  try {
    const res = await EmailTokenServices.getValueSources();
    valueSources.value = res.data || [];
  } catch (e) {
    valueSources.value = [];
    formError.value = e.response?.data?.message || "Unable to load value sources.";
  }
};

const loadRow = async () => {
  formError.value = "";
  await loadValueSources();
  if (!isEdit.value) {
    form.value = emptyForm();
    return;
  }
  try {
    const res = await EmailTokenServices.get(props.emailTokenId);
    const row = res.data;
    form.value = {
      tokenCode: row.tokenCode || "",
      description: row.description || "",
      valueSource: row.valueSource || null,
    };
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load token.";
  }
};

watch(
  () => [props.modelValue, props.emailTokenId],
  ([visible]) => {
    if (visible) loadRow();
  },
  { immediate: true }
);

const close = () => {
  open.value = false;
};

const save = async () => {
  formError.value = "";
  const tokenCode = form.value.tokenCode?.trim();
  const description = form.value.description?.trim();
  const valueSource = form.value.valueSource;
  if (!tokenCode) {
    formError.value = "Token code is required.";
    return;
  }
  if (!TOKEN_CODE_PATTERN.test(tokenCode)) {
    formError.value =
      "Token code must start with a capital letter and use only capital letters, digits, and underscores.";
    return;
  }
  if (!description) {
    formError.value = "Description is required.";
    return;
  }
  if (!valueSource) {
    formError.value = "Value source is required.";
    return;
  }

  saving.value = true;
  const payload = { tokenCode, description, valueSource };
  try {
    if (isEdit.value) {
      await EmailTokenServices.update(props.emailTokenId, payload);
    } else {
      await EmailTokenServices.create(payload);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save token.";
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog v-model="open" max-width="560" persistent>
    <v-card>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" density="compact" class="mb-4">{{ formError }}</v-alert>
        <v-text-field
          v-model="form.tokenCode"
          label="Token code"
          density="compact"
          class="mb-2"
          autocomplete="off"
          hint="Written in templates as {{TOKEN_CODE}}"
          persistent-hint
        />
        <v-text-field v-model="form.description" label="Description" density="compact" class="mb-2" autocomplete="off" />
        <v-select
          v-model="form.valueSource"
          :items="valueSourceItems"
          label="Value source"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
