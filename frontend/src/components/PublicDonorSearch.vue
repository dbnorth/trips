<script setup>
import { ref } from "vue";
import PublicServices from "../services/publicServices.js";
import { donorLookupChoice } from "../utils/donorUtils.js";

const props = defineProps({
  tripId: { type: [Number, String], default: null },
});

const emit = defineEmits(["chosen", "cleared"]);

const query = ref("");
const busy = ref(false);
const notice = ref("");
const error = ref("");
const matches = ref([]);

const search = () => {
  notice.value = "";
  error.value = "";
  matches.value = [];
  const q = query.value.trim();
  if (!q) {
    error.value = "Enter a donor name or email to look up.";
    return;
  }
  busy.value = true;
  PublicServices.searchDonors(props.tripId, q)
    .then((r) => {
      const rows = r.data?.matches || [];
      if (!rows.length) {
        notice.value = "Donor not found. Enter your name and email below.";
        emit("cleared");
        return;
      }
      if (rows.length === 1) {
        notice.value = "Donor found.";
        emit("chosen", rows[0]);
        return;
      }
      matches.value = rows;
      notice.value = "Several donors match. Choose one.";
    })
    .catch((e) => {
      error.value = e.response?.data?.message || "Unable to look up donor.";
    })
    .finally(() => {
      busy.value = false;
    });
};

const choose = (match) => {
  matches.value = [];
  notice.value = "Donor found.";
  emit("chosen", match);
};
</script>

<template>
  <v-row dense class="mb-2">
    <v-col cols="8">
      <v-text-field v-model="query" label="Name or email" density="compact" autocomplete="off" hide-details />
    </v-col>
    <v-col cols="4" class="d-flex align-center">
      <v-btn variant="tonal" :loading="busy" @click="search">Look up</v-btn>
    </v-col>
  </v-row>
  <div v-if="matches.length" class="mb-2">
    <v-btn v-for="match in matches" :key="match.id" variant="text" class="d-block" @click="choose(match)">
      {{ donorLookupChoice(match) }}
    </v-btn>
  </div>
  <v-alert v-if="error" type="error" density="compact" class="mb-3">{{ error }}</v-alert>
  <v-alert v-if="notice" type="info" density="compact" class="mb-3">{{ notice }}</v-alert>
</template>
