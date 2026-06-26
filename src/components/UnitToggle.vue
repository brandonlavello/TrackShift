<script setup>
import { useUnitStore } from '@/stores/unitStore';

const unitStore = useUnitStore();
</script>

<template>
  <div
    class="tw-inline-flex tw-rounded-lg tw-border tw-border-surface-border tw-bg-slate-50 tw-p-0.5"
    role="group"
    aria-label="Distance units"
  >
    <button
      type="button"
      class="tw-rounded-md tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition"
      :class="
        unitStore.distanceUnit === 'mi'
          ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm'
          : 'tw-text-slate-500 hover:tw-text-slate-700'
      "
      :aria-pressed="unitStore.distanceUnit === 'mi'"
      @click="unitStore.setDistanceUnit('mi')"
    >
      mi
    </button>
    <button
      type="button"
      class="tw-rounded-md tw-px-3 tw-py-1.5 tw-text-xs tw-font-semibold tw-transition"
      :class="
        unitStore.distanceUnit === 'km'
          ? 'tw-bg-white tw-text-slate-900 tw-shadow-sm'
          : 'tw-text-slate-500 hover:tw-text-slate-700'
      "
      :aria-pressed="unitStore.distanceUnit === 'km'"
      @click="unitStore.setDistanceUnit('km')"
    >
      km
    </button>
  </div>
</template>
