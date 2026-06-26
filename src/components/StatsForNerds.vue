<script setup>
import { computed, ref } from 'vue';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/outline';

import CosmicDiagram from '@/components/CosmicDiagram.vue';
import { formatDistance, formatDuration, formatSpeedKph } from '@/lib/format';
import {
  computeReferenceFrameMotions,
  formatCosmicDistance,
  formatCosmicSpeed,
} from '@/lib/referenceFrames';
import { useGpxStore } from '@/stores/gpxStore';
import { useUnitStore } from '@/stores/unitStore';

const gpxStore = useGpxStore();
const unitStore = useUnitStore();

const distanceUnit = computed(() => unitStore.distanceUnit);

const isOpen = ref(false);
const hoveredRow = ref(null);

const nerdsInput = computed(() => {
  const elapsed = gpxStore.stats.corrected.elapsedSeconds;
  const distance = gpxStore.stats.corrected.distanceMeters;
  const speedMps =
    elapsed > 0 ? distance / elapsed : gpxStore.stats.corrected.avgSpeedKph / 3.6;

  let latitudeDeg = 0;
  const points = gpxStore.correctedRunPoints.length
    ? gpxStore.correctedRunPoints
    : gpxStore.runPoints;
  if (points.length) {
    const sum = points.reduce((acc, p) => acc + p.lat, 0);
    latitudeDeg = sum / points.length;
  }

  return {
    elapsedSeconds: gpxStore.isReady ? elapsed : 3600,
    latitudeDeg,
    surfaceDistanceMeters: gpxStore.isReady ? distance : 0,
    surfaceSpeedMps: gpxStore.isReady ? speedMps : 0,
    hasActivity: gpxStore.isReady,
  };
});

const frameRows = computed(() =>
  computeReferenceFrameMotions({
    elapsedSeconds: nerdsInput.value.elapsedSeconds,
    latitudeDeg: nerdsInput.value.latitudeDeg,
    surfaceDistanceMeters: nerdsInput.value.surfaceDistanceMeters,
    surfaceSpeedMps: nerdsInput.value.surfaceSpeedMps,
  }),
);

const activeDiagramRing = computed(() => hoveredRow.value ?? null);

const summation = computed(() => {
  const input = nerdsInput.value;
  const surface = frameRows.value.find((row) => row.id === 'surface');
  const cmb = frameRows.value.find((row) => row.id === 'cmb');
  const unit = distanceUnit.value;

  if (!input.hasActivity) return '';

  const durationLabel = formatDuration(input.elapsedSeconds);
  const runDistance = formatDistance(surface?.distanceMeters ?? 0, unit);
  const runSpeed = formatSpeedKph(input.surfaceSpeedMps * 3.6, unit);

  if (!cmb) {
    return `During your ${durationLabel} workout, you ran ${runDistance} at ${runSpeed}.`;
  }

  return `During your ${durationLabel} workout, you ran ${runDistance} at ${runSpeed} — and relative to the CMB, you traveled ${formatCosmicDistance(cmb.distanceMeters, unit)} at ${formatCosmicSpeed(cmb.speedMps, unit)}.`;
});

function toggle() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="tw-border-t tw-border-dashed tw-border-slate-200 tw-pt-4">
    <button
      type="button"
      class="tw-flex tw-w-full tw-items-center tw-justify-between tw-gap-2 tw-rounded-md tw-py-1.5 tw-text-left tw-text-xs tw-text-slate-500 tw-transition hover:tw-text-slate-700"
      :aria-expanded="isOpen"
      aria-controls="stats-for-nerds-panel"
      @click="toggle"
    >
      <span>Stats for nerds</span>
      <ChevronUpIcon
        v-if="isOpen"
        class="tw-h-3.5 tw-w-3.5 tw-shrink-0"
        aria-hidden="true"
      />
      <ChevronDownIcon
        v-else
        class="tw-h-3.5 tw-w-3.5 tw-shrink-0"
        aria-hidden="true"
      />
    </button>

    <div
      v-show="isOpen"
      id="stats-for-nerds-panel"
      class="tw-mt-3 tw-space-y-4 tw-rounded-lg tw-border tw-border-slate-100 tw-bg-slate-50/80 tw-p-4"
    >
      <p
        v-if="!nerdsInput.hasActivity"
        class="tw-text-xs tw-text-slate-500"
      >
        Load an activity for your run — cosmic distances below use a 1-hour placeholder at your
        latitude.
      </p>

      <div class="tw-grid tw-gap-5 lg:tw-grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <CosmicDiagram
          :active-ring="activeDiagramRing"
          :latitude-deg="nerdsInput.latitudeDeg"
        />

        <div class="tw-overflow-x-auto">
          <table class="tw-min-w-full tw-text-left tw-text-xs">
            <thead>
              <tr class="tw-border-b tw-border-slate-200 tw-text-[10px] tw-uppercase tw-tracking-wide tw-text-slate-400">
                <th
                  scope="col"
                  class="tw-pb-2 tw-pr-2 tw-font-medium"
                >
                  Frame
                </th>
                <th
                  scope="col"
                  class="tw-pb-2 tw-pr-2 tw-font-medium"
                >
                  Speed
                </th>
                <th
                  scope="col"
                  class="tw-pb-2 tw-font-medium"
                >
                  Distance ({{ nerdsInput.hasActivity ? 'run' : '1 hr' }})
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in frameRows"
                :key="row.id"
                class="tw-border-b tw-border-slate-100 last:tw-border-0"
                @mouseenter="hoveredRow = row.diagramRing"
                @mouseleave="hoveredRow = null"
              >
                <th
                  scope="row"
                  class="tw-py-2 tw-pr-2 tw-align-top tw-font-normal"
                >
                  <span class="tw-font-medium tw-text-slate-800">{{ row.name }}</span>
                </th>
                <td class="tw-py-2 tw-pr-2 tw-align-top tw-tabular-nums tw-text-slate-600">
                  {{ formatCosmicSpeed(row.speedMps, distanceUnit) }}
                </td>
                <td class="tw-py-2 tw-align-top tw-tabular-nums tw-text-slate-700">
                  {{ formatCosmicDistance(row.distanceMeters, distanceUnit) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p
        v-if="nerdsInput.hasActivity && summation"
        class="tw-text-xs tw-leading-relaxed tw-text-slate-600"
      >
        {{ summation }}
      </p>

      <p class="tw-text-[10px] tw-leading-relaxed tw-text-slate-400">
        Approximate straight-line estimates. Not absolute physics.
      </p>
    </div>
  </div>
</template>
