<script setup>
import { ref, computed, watch } from "vue";
import EmailTypeServices from "../services/emailTypeServices.js";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  emailTypeId: { type: [Number, String], default: null },
});

const emit = defineEmits(["update:modelValue", "saved"]);

const saving = ref(false);
const formError = ref("");

const emptyForm = () => ({
  typeCode: "",
  description: "",
  eventCode: "",
});

const form = ref(emptyForm());

const isEdit = computed(() => props.emailTypeId != null && props.emailTypeId !== "");
const title = computed(() => (isEdit.value ? "Edit email type" : "Add email type"));
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit("update:modelValue", v),
});

const loadRow = async () => {
  formError.value = "";
  if (!isEdit.value) {
    form.value = emptyForm();
    return;
  }
  try {
    const res = await EmailTypeServices.get(props.emailTypeId);
    const row = res.data;
    form.value = {
      typeCode: row.typeCode || "",
      description: row.description || "",
      eventCode: row.eventCode || "",
    };
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to load email type.";
  }
};

watch(
  () => [props.modelValue, props.emailTypeId],
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
  const typeCode = form.value.typeCode?.trim();
  const description = form.value.description?.trim();
  const eventCode = form.value.eventCode?.trim();
  if (!typeCode) {
    formError.value = "Type code is required.";
    return;
  }
  if (!description) {
    formError.value = "Description is required.";
    return;
  }
  if (!eventCode) {
    formError.value = "Event code is required.";
    return;
  }

  saving.value = true;
  const payload = { typeCode, description, eventCode };

  try {
    if (isEdit.value) {
      await EmailTypeServices.update(props.emailTypeId, payload);
    } else {
      await EmailTypeServices.create(payload);
    }
    emit("saved");
    close();
  } catch (e) {
    formError.value = e.response?.data?.message || "Unable to save email type.";
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
        <v-text-field v-model="form.typeCode" label="Type code" density="compact" class="mb-2" autocomplete="off" />
        <v-text-field v-model="form.description" label="Description" density="compact" class="mb-2" autocomplete="off" />
        <v-text-field v-model="form.eventCode" label="Event code" density="compact" autocomplete="off" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
