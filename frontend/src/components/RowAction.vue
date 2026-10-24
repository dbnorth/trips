<script setup>
defineOptions({ inheritAttrs: false });

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
});
</script>

<template>
  <v-tooltip :text="label" location="top">
    <template #activator="{ props: tooltipProps }">
      <!-- The wrapper keeps the tooltip working when the button is disabled (no pointer events). -->
      <span
        v-bind="tooltipProps"
        class="d-inline-block"
        @focusin="(e) => tooltipProps.onFocus?.(e)"
        @focusout="(e) => tooltipProps.onBlur?.(e)"
      >
        <v-btn v-bind="$attrs" :icon="icon" size="small" variant="text" :aria-label="label" />
      </span>
    </template>
  </v-tooltip>
</template>
