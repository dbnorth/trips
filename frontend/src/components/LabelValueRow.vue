<script setup>
defineProps({
  label: { type: String, required: true },
});
</script>

<template>
  <tr>
    <th scope="row" class="label-value-label text-body-2 text-medium-emphasis">{{ label }}</th>
    <td class="label-value-value text-body-2"><slot /></td>
  </tr>
</template>

<style scoped>
.label-value-label {
  width: 40%;
  font-weight: 400;
  text-align: left;
}

.label-value-label,
.label-value-value {
  vertical-align: top;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  height: auto !important;
  overflow-wrap: anywhere;
}
</style>
