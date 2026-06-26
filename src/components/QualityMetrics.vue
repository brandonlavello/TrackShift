<script setup>
import { computed } from 'vue';
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';

import { formatDistance, formatDuration } from '@/lib/format';
import { useGpxStore } from '@/stores/gpxStore';
import { useUnitStore } from '@/stores/unitStore';

const gpxStore = useGpxStore();
const unitStore = useUnitStore();

const confidenceClasses = computed(() => {
  const label = gpxStore.quality.confidenceLabel.toLowerCase();
  if (label === 'good' || label === 'high' || label === 'estimated') {
    return 'tw-bg-emerald-50 tw-text-emerald-700 tw-ring-emerald-600/20';
  }
  if (label === 'fair' || label === 'medium') {
    return 'tw-bg-amber-50 tw-text-amber-700 tw-ring-amber-600/20';
  }
  if (label === 'low' || label === 'poor') {
    return 'tw-bg-red-50 tw-text-red-700 tw-ring-red-600/20';
  }
  return 'tw-bg-slate-100 tw-text-slate-600 tw-ring-slate-500/20';
});

const alignmentPercent = computed(() =>
  Math.round(gpxStore.quality.alignmentScore * 100),
);

const metrics = computed(() => [
  {
    label: 'Alignment score',
    value: `${alignmentPercent.value}%`,
    hint: 'How well the corrected lap overlaps itself.',
  },
  {
    label: 'Estimate sample',
    value: formatDuration(gpxStore.quality.calibrationDurationSec),
    hint: 'Duration of FIT/GPS samples used for ship-motion estimate.',
  },
  {
    label: 'GPS wander',
    value: formatDistance(gpxStore.quality.calibrationResidualMeters, unitStore.distanceUnit),
    hint: 'Perpendicular GPS scatter in the trimmed estimate window.',
  },
  {
    label: 'Loop closure error',
    value: formatDistance(gpxStore.quality.loopClosureErrorMeters, unitStore.distanceUnit),
    hint: 'Start/end gap on the corrected path.',
  },
  {
    label: 'Compactness',
    value: gpxStore.quality.compactness.toFixed(2),
    hint: 'Higher means a tighter, more lap-like shape.',
  },
]);
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="quality-heading"
  >
    <div class="dashboard-card-header">
      <div class="tw-min-w-0">
        <h2
          id="quality-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Quality Metrics
        </h2>
        <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
          Signals that help judge whether the correction looks trustworthy.
        </p>
      </div>
      <span
        v-if="gpxStore.isReady && gpxStore.quality.confidenceLabel !== '—'"
        class="tw-inline-flex tw-shrink-0 tw-whitespace-nowrap tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-semibold tw-ring-1 tw-ring-inset"
        :class="confidenceClasses"
      >
        {{ gpxStore.quality.confidenceLabel }} confidence
      </span>
    </div>

    <div class="dashboard-card-body">
      <div
        v-if="!gpxStore.isReady"
        class="tw-rounded-lg tw-bg-slate-50 tw-p-4 tw-text-sm tw-text-slate-500"
      >
        Quality metrics appear after correction preview is available.
      </div>

      <template v-else>
        <dl class="tw-grid tw-gap-3 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
          <div
            v-for="metric in metrics"
            :key="metric.label"
            class="tw-rounded-lg tw-border tw-border-slate-200 tw-p-4"
          >
            <dt class="stat-label">
              {{ metric.label }}
            </dt>
            <dd class="stat-value">
              {{ metric.value }}
            </dd>
            <p class="tw-mt-2 tw-text-xs tw-text-slate-500">
              {{ metric.hint }}
            </p>
          </div>
        </dl>

        <div
          v-if="gpxStore.quality.speedSpikeWarnings > 0"
          class="tw-mt-4 tw-flex tw-items-start tw-gap-3 tw-rounded-lg tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-4"
          role="status"
        >
          <ExclamationTriangleIcon
            class="tw-mt-0.5 tw-h-5 tw-w-5 tw-shrink-0 tw-text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p class="tw-text-sm tw-font-medium tw-text-amber-900">
              {{ gpxStore.quality.speedSpikeWarnings }} speed spike warning{{
                gpxStore.quality.speedSpikeWarnings === 1 ? '' : 's'
              }}
            </p>
            <p class="tw-mt-1 tw-text-sm tw-text-amber-800">
              Sudden pace changes may indicate bad GPS fixes or segment boundaries that need trimming.
            </p>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
