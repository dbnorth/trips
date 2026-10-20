<template>
  <v-table density="compact" class="label-value-table mb-3">
    <tbody>
      <slot />
    </tbody>
  </v-table>
</template>

<style scoped>
.label-value-table :deep(table) {
  table-layout: fixed;
}
</style>
