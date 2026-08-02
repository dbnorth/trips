<script setup>
import { computed } from "vue";
import { formatMoneyDisplay } from "../utils/moneyUtils.js";
import { validateTravelOptionSelections } from "../utils/tripApplicationForm.js";

const props = defineProps({
  baseCost: { type: [Number, String], default: null },
  options: { type: Array, default: () => [] },
  selectedIds: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:selectedIds"]);

const hasOptions = computed(() => (props.options || []).length > 0);

const selectedSet = computed(() => new Set((props.selectedIds || []).map(Number)));

const optionGroups = computed(() => {
  const groups = new Map();
  for (const option of props.options || []) {
    const setNumber = Number(option.setNumber) > 0 ? Number(option.setNumber) : 1;
    if (!groups.has(setNumber)) groups.set(setNumber, []);
    groups.get(setNumber).push(option);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([setNumber, options]) => ({
      setNumber,
      required: options.length > 1,
      options: [...options].sort((a, b) => Number(a.id) - Number(b.id)),
    }));
});

const baseCostNumber = computed(() => {
  const n = Number(props.baseCost);
  return Number.isFinite(n) ? n : 0;
});

const adjustmentTotal = computed(() =>
  (props.options || []).reduce((sum, option) => {
    if (!selectedSet.value.has(Number(option.id))) return sum;
    const amount = Number(option.priceAdjustment);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0)
);

const adjustedCost = computed(() =>
  Math.round((baseCostNumber.value + adjustmentTotal.value) * 100) / 100
);

const formatCost = (value) => formatMoneyDisplay(value, { allowNegative: true }) || "$0.00";

const formatAdjustment = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) return formatCost(0);
  const formatted = formatCost(Math.abs(amount));
  return amount > 0 ? `+${formatted}` : `-${formatted}`;
};

const selectedIdForSet = (group) => {
  const match = (group.options || []).find((option) => selectedSet.value.has(Number(option.id)));
  return match ? Number(match.id) : null;
};

const isSingleSelected = (option) => selectedSet.value.has(Number(option.id));

const replaceSetSelection = (group, value) => {
  if (props.disabled) return;

  const groupIds = new Set((group.options || []).map((o) => Number(o.id)));
  const next = [...selectedSet.value].filter((id) => !groupIds.has(Number(id)));

  if (value != null) {
    next.push(Number(value));
  }

  emit("update:selectedIds", next);
};

const onSingleToggle = (group, option, checked) => {
  replaceSetSelection(group, checked ? Number(option.id) : null);
};

const onMultiSelection = (group, value) => {
  if (value == null) return;
  replaceSetSelection(group, value);
};

defineExpose({
  validate: () => validateTravelOptionSelections(props.options, props.selectedIds),
});
</script>

<template>
  <div v-if="hasOptions" class="mt-4">
    <div class="text-subtitle-2 mb-2">Travel options</div>

    <div class="text-body-2 mb-3">
      Trip price:
      <strong>{{ formatCost(baseCostNumber) }}</strong>
    </div>

    <div v-for="group in optionGroups" :key="group.setNumber" class="mb-4">
      <div class="text-subtitle-2 mb-1">
        Trip Option {{ group.setNumber }}
        <span v-if="group.required" class="text-caption text-medium-emphasis"> (required)</span>
      </div>

      <template v-if="group.options.length === 1">
        <div
          v-for="option in group.options"
          :key="option.id"
          class="d-flex align-center justify-space-between ga-3"
        >
          <v-checkbox
            :model-value="isSingleSelected(option)"
            :label="option.description"
            :disabled="disabled"
            density="compact"
            hide-details
            class="mt-0"
            @update:model-value="onSingleToggle(group, option, $event)"
          />
          <span class="text-body-2 text-medium-emphasis text-no-wrap">
            {{ formatAdjustment(option.priceAdjustment) }}
          </span>
        </div>
      </template>

      <v-radio-group
        v-else
        :model-value="selectedIdForSet(group)"
        :disabled="disabled"
        density="compact"
        hide-details
        class="mt-0 travel-option-set"
        @update:model-value="onMultiSelection(group, $event)"
      >
        <v-radio
          v-for="option in group.options"
          :key="option.id"
          :value="Number(option.id)"
          density="compact"
        >
          <template #label>
            <div class="d-flex align-center justify-space-between ga-3 w-100">
              <span>{{ option.description }}</span>
              <span class="text-medium-emphasis text-no-wrap">
                {{ formatAdjustment(option.priceAdjustment) }}
              </span>
            </div>
          </template>
        </v-radio>
      </v-radio-group>
    </div>

    <div class="text-body-2 mt-3">
      New trip price:
      <strong>{{ formatCost(adjustedCost) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.travel-option-set :deep(.v-selection-control) {
  align-items: center;
}

.travel-option-set :deep(.v-label) {
  width: 100%;
  opacity: 1;
}
</style>
