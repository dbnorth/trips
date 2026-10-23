<script setup>
import { computed } from "vue";
import { getBaseUrl } from "../services/services.js";

const props = defineProps({
  html: { type: String, default: "" },
});

const srcdoc = computed(
  () =>
    `<!doctype html><html><head><base href="${getBaseUrl()}">` +
    "<style>body{font-family:Arial,sans-serif;font-size:14px;margin:12px}</style>" +
    `</head><body>${props.html}</body></html>`
);
</script>

<template>
  <iframe
    class="email-preview-frame border rounded"
    sandbox=""
    title="Email body"
    :srcdoc="srcdoc"
    data-testid="email-preview-frame"
  />
</template>

<style scoped>
.email-preview-frame {
  width: 100%;
  height: 400px;
}
</style>
