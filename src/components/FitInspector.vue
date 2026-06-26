<script setup>
import { computed } from 'vue';

import { useGpxStore } from '@/stores/gpxStore';

const gpxStore = useGpxStore();

const debug = computed(() => gpxStore.fitDebug);
const sampleJson = computed(() =>
  debug.value?.sampleRawRecord ? JSON.stringify(debug.value.sampleRawRecord, null, 2) : '',
);

function formatPoint(point) {
  if (!point) return '—';
  return `${point.lat?.toFixed(6)}, ${point.lon?.toFixed(6)} @ ${point.time.toISOString()}`;
}
</script>

<template>
  <details
    v-if="debug"
    class="dashboard-card tw-text-sm"
    aria-label="FIT inspector debug panel"
  >
    <summary class="tw-cursor-pointer tw-list-none tw-px-4 tw-py-3 sm:tw-px-5">
      <div class="tw-flex tw-items-center tw-justify-between tw-gap-3">
        <div>
          <h2 class="tw-text-base tw-font-semibold tw-text-slate-900">
            FIT Inspector
          </h2>
          <p class="tw-mt-0.5 tw-text-xs tw-text-slate-500">
            Development debug details for parsed FIT files.
          </p>
        </div>
        <span class="tw-rounded-full tw-bg-slate-100 tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium tw-text-slate-600">
          Debug
        </span>
      </div>
    </summary>

    <div class="tw-border-t tw-border-surface-border tw-px-4 tw-py-4 sm:tw-px-5">
      <dl class="tw-grid tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
        <div class="tw-rounded-lg tw-bg-slate-50 tw-p-3">
          <dt class="stat-label">
            File type
          </dt>
          <dd class="stat-value tw-text-base">
            {{ debug.fileType.toUpperCase() }}
          </dd>
        </div>
        <div class="tw-rounded-lg tw-bg-slate-50 tw-p-3">
          <dt class="stat-label">
            Raw records
          </dt>
          <dd class="stat-value tw-text-base">
            {{ debug.rawRecordCount.toLocaleString() }}
          </dd>
        </div>
        <div class="tw-rounded-lg tw-bg-slate-50 tw-p-3">
          <dt class="stat-label">
            Usable GPS points
          </dt>
          <dd class="stat-value tw-text-base">
            {{ debug.usableGpsCount.toLocaleString() }}
          </dd>
        </div>
      </dl>

      <div class="tw-mt-4">
        <h3 class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
          Available record fields
        </h3>
        <p class="tw-mt-2 tw-break-words tw-font-mono tw-text-xs tw-text-slate-700">
          {{ debug.availableFields.join(', ') }}
        </p>
      </div>

      <div class="tw-mt-4 tw-grid tw-gap-3 lg:tw-grid-cols-2">
        <div class="tw-rounded-lg tw-border tw-border-slate-200 tw-p-3">
          <h3 class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
            First usable point
          </h3>
          <p class="tw-mt-2 tw-font-mono tw-text-xs tw-text-slate-700">
            {{ formatPoint(debug.firstUsablePoint) }}
          </p>
        </div>
        <div class="tw-rounded-lg tw-border tw-border-slate-200 tw-p-3">
          <h3 class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
            Last usable point
          </h3>
          <p class="tw-mt-2 tw-font-mono tw-text-xs tw-text-slate-700">
            {{ formatPoint(debug.lastUsablePoint) }}
          </p>
        </div>
      </div>

      <div
        v-if="sampleJson"
        class="tw-mt-4"
      >
        <h3 class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
          Sample raw record
        </h3>
        <pre class="tw-mt-2 tw-max-h-64 tw-overflow-auto tw-rounded-lg tw-bg-slate-900 tw-p-3 tw-text-xs tw-text-slate-100">{{ sampleJson }}</pre>
      </div>
    </div>
  </details>
</template>

<style scoped>
summary::-webkit-details-marker {
  display: none;
}
</style>
