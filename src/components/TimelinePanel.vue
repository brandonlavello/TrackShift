<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { ArrowUturnLeftIcon, ScissorsIcon } from '@heroicons/vue/24/outline';

import { useSliderControl } from '@/composables/useSliderControl';
import { computeGpsSpeedMps } from '@/lib/distance';
import { formatSpeedKph, speedUnitLabel } from '@/lib/format';
import { useGpxStore } from '@/stores/gpxStore';
import { useUnitStore } from '@/stores/unitStore';

const gpxStore = useGpxStore();
const unitStore = useUnitStore();
const { segments, allPoints } = storeToRefs(gpxStore);

const trimMessage = ref('');
const fineTune = ref(false);

const maxIndex = computed(() => Math.max(allPoints.value.length - 1, 0));

const isFullActivity = computed(
  () => segments.value.run.start === 0 && segments.value.run.end === maxIndex.value,
);

function commitRunSegment(start: number, end: number, finalize = false) {
  gpxStore.updateRunSegment(
    { start, end },
    finalize ? {} : { reanalyze: false },
  );
}

const runStartSlider = useSliderControl(
  () => segments.value.run.start,
  (start) => commitRunSegment(start, runEndSlider.local.value, false),
  { debounceMs: 150 },
);

const runEndSlider = useSliderControl(
  () => segments.value.run.end,
  (end) => commitRunSegment(runStartSlider.local.value, end, false),
  { debounceMs: 150 },
);

function finalizeRunSegment() {
  commitRunSegment(runStartSlider.local.value, runEndSlider.local.value, true);
}

function handleRunStartInput(value: string | number) {
  const start = Math.min(Number(value), runEndSlider.local.value);
  runStartSlider.handleInput(start);
}

function handleRunStartChange(value: string | number) {
  const start = Math.min(Number(value), runEndSlider.local.value);
  runStartSlider.handleChange(start);
  finalizeRunSegment();
}

function handleRunEndInput(value: string | number) {
  const end = Math.max(Number(value), runStartSlider.local.value);
  runEndSlider.handleInput(end);
}

function handleRunEndChange(value: string | number) {
  const end = Math.max(Number(value), runStartSlider.local.value);
  runEndSlider.handleChange(end);
  finalizeRunSegment();
}

function nudgeRunStart(delta: number) {
  const next = Math.max(0, Math.min(runStartSlider.local.value + delta, runEndSlider.local.value));
  runStartSlider.handleChange(next);
  finalizeRunSegment();
}

function nudgeRunEnd(delta: number) {
  const next = Math.max(runStartSlider.local.value, Math.min(runEndSlider.local.value + delta, maxIndex.value));
  runEndSlider.handleChange(next);
  finalizeRunSegment();
}

const segmentSliderKey = computed(
  () => `${allPoints.value.length}`,
);

const runDurationLabel = computed(() => {
  const start = allPoints.value[segments.value.run.start]?.time;
  const end = allPoints.value[segments.value.run.end]?.time;
  if (!start || !end) return '—';
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
});

const trimSummary = computed(() => {
  const parts = [];
  if (gpxStore.trimBefore) {
    parts.push(`lead-in ${gpxStore.trimBefore.end - gpxStore.trimBefore.start + 1} pts`);
  }
  if (gpxStore.trimAfter) {
    parts.push(`trail-out ${gpxStore.trimAfter.end - gpxStore.trimAfter.start + 1} pts`);
  }
  return parts.length ? parts.join(' · ') : 'No trimmed edges';
});

const speedSeries = computed(() => {
  const points = allPoints.value;
  if (!points.length) return [];

  const gpsSpeeds = computeGpsSpeedMps(points);
  return points.map((point, index) => {
    const deviceMps = point.speedMps;
    const gpsMps = gpsSpeeds[index];
    const mps = deviceMps ?? gpsMps ?? 0;
    return {
      index,
      mps,
      kph: mps * 3.6,
      displaySpeed: mps * (unitStore.distanceUnit === 'mi' ? 2.23694 : 3.6),
      source: deviceMps != null ? 'device' : 'gps',
    };
  });
});

const speedPath = computed(() => {
  const series = speedSeries.value;
  if (series.length < 2) return '';

  const maxSpeed = Math.max(...series.map((s) => s.displaySpeed), 1);
  const width = 360;
  const height = 72;
  const pad = 4;

  const coords = series.map((entry, index) => {
    const x = pad + (index / Math.max(series.length - 1, 1)) * (width - pad * 2);
    const y = pad + height - pad - (entry.displaySpeed / maxSpeed) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M ${coords.join(' L ')}`;
});

const peakSpeedLabel = computed(() => {
  const peakKph = Math.max(...speedSeries.value.map((s) => s.kph), 0);
  return formatSpeedKph(peakKph, unitStore.distanceUnit);
});

const speedUnit = computed(() => speedUnitLabel(unitStore.distanceUnit));

function formatIndexLabel(index) {
  const point = allPoints.value[index];
  if (!point) return `Point ${index}`;
  return point.time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function showTrimMessage(message) {
  trimMessage.value = message;
  window.setTimeout(() => {
    trimMessage.value = '';
  }, 4000);
}

function handleAutoTrim() {
  const result = gpxStore.autoTrimRunSegment();
  if (result === 'applied') {
    showTrimMessage('Run window updated from FIT speed and standing-still edges.');
  } else if (result === 'unchanged') {
    showTrimMessage('Run window already matches the auto-trim result.');
  } else {
    showTrimMessage('Could not auto-trim — no clear run or standing-still edges found.');
  }
}

function handleResetTrim() {
  if (isFullActivity.value) {
    showTrimMessage('Run window already spans the full activity.');
    return;
  }
  gpxStore.resetRunSegment();
  showTrimMessage('Run window reset to the full activity.');
}
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="timeline-heading"
  >
    <div class="dashboard-card-header">
      <div>
        <h2
          id="timeline-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Timeline &amp; Segments
        </h2>
        <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
          Set the run window. Standing-still lead-in/trail-out is auto-trimmed on upload when detected.
        </p>
      </div>
    </div>

    <div class="dashboard-card-body tw-space-y-6">
      <div
        v-if="!gpxStore.hasFile"
        class="tw-rounded-lg tw-bg-slate-50 tw-p-4 tw-text-sm tw-text-slate-500"
      >
        Load a FIT or GPX file to define the run segment.
      </div>

      <template v-else>
        <div
          v-if="speedSeries.length"
          class="tw-space-y-2"
        >
          <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
            <h3 class="tw-text-sm tw-font-semibold tw-text-slate-800">
              Speed over time
            </h3>
            <span class="tw-text-xs tw-text-slate-500">Peak {{ peakSpeedLabel }} ({{ speedUnit }})</span>
          </div>
          <div class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3">
            <svg
              viewBox="0 0 360 80"
              class="tw-h-20 tw-w-full"
              role="img"
              aria-label="Speed chart"
            >
              <path
                v-if="speedPath"
                :d="speedPath"
                fill="none"
                stroke="#1d65f1"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <p class="tw-mt-1 tw-text-xs tw-text-slate-500">
              Uses FIT device speed when available, otherwise GPS-derived speed.
            </p>
          </div>
        </div>

        <div class="tw-space-y-3">
          <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2">
            <h3 class="tw-text-sm tw-font-semibold tw-text-slate-800">
              Run segment
            </h3>
            <div class="tw-flex tw-flex-col tw-items-end tw-gap-0.5">
              <span
                v-if="segments.run.label"
                class="tw-text-xs tw-font-medium tw-text-slate-600"
              >
                {{ segments.run.label }}
              </span>
              <span class="tw-text-xs tw-font-medium tw-text-brand-700">
                Duration {{ runDurationLabel }}
              </span>
              <span class="tw-text-xs tw-text-slate-500">{{ trimSummary }}</span>
            </div>
          </div>

          <div class="tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2">
            <button
              type="button"
              class="btn-primary tw-w-full tw-py-2 tw-text-xs"
              @click="handleAutoTrim"
            >
              <ScissorsIcon
                class="tw-h-4 tw-w-4"
                aria-hidden="true"
              />
              Auto-trim run
            </button>
            <button
              type="button"
              class="btn-secondary tw-w-full tw-py-2 tw-text-xs"
              :title="isFullActivity ? 'Run window already spans the full activity' : undefined"
              @click="handleResetTrim"
            >
              <ArrowUturnLeftIcon
                class="tw-h-4 tw-w-4"
                aria-hidden="true"
              />
              Reset to full activity
            </button>
          </div>

          <p
            v-if="trimMessage"
            class="tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-px-3 tw-py-2 tw-text-xs tw-text-slate-600"
            role="status"
          >
            {{ trimMessage }}
          </p>

          <div class="tw-flex tw-flex-wrap tw-items-center tw-justify-end">
            <button
              type="button"
              class="btn-secondary tw-py-1.5 tw-px-3 tw-text-xs"
              :aria-pressed="fineTune"
              @click="fineTune = !fineTune"
            >
              {{ fineTune ? 'Standard trim' : 'Fine-tune trim' }}
            </button>
          </div>

          <div
            :key="segmentSliderKey"
            class="tw-grid tw-gap-4 sm:tw-grid-cols-2"
          >
            <div>
              <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
                <label
                  for="run-start"
                  class="form-label"
                >Run start</label>
                <div
                  v-if="fineTune"
                  class="tw-flex tw-items-center tw-gap-1"
                >
                  <button
                    type="button"
                    class="btn-secondary tw-min-w-0 tw-px-2 tw-py-1 tw-text-xs"
                    aria-label="Move run start one point earlier"
                    :disabled="runStartSlider.local.value <= 0"
                    @click="nudgeRunStart(-1)"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    class="btn-secondary tw-min-w-0 tw-px-2 tw-py-1 tw-text-xs"
                    aria-label="Move run start one point later"
                    :disabled="runStartSlider.local.value >= runEndSlider.local.value"
                    @click="nudgeRunStart(1)"
                  >
                    +1
                  </button>
                </div>
              </div>
              <input
                id="run-start"
                type="range"
                min="0"
                :max="runEndSlider.local.value"
                step="1"
                :value="runStartSlider.local.value"
                class="slider-control tw-mt-2 tw-w-full"
                @input="handleRunStartInput($event.target.value)"
                @change="handleRunStartChange($event.target.value)"
              >
              <p class="form-hint">
                {{ formatIndexLabel(runStartSlider.local.value) }} · trims lead-in
              </p>
            </div>
            <div>
              <div class="tw-flex tw-items-center tw-justify-between tw-gap-2">
                <label
                  for="run-end"
                  class="form-label"
                >Run end</label>
                <div
                  v-if="fineTune"
                  class="tw-flex tw-items-center tw-gap-1"
                >
                  <button
                    type="button"
                    class="btn-secondary tw-min-w-0 tw-px-2 tw-py-1 tw-text-xs"
                    aria-label="Move run end one point earlier"
                    :disabled="runEndSlider.local.value <= runStartSlider.local.value"
                    @click="nudgeRunEnd(-1)"
                  >
                    −1
                  </button>
                  <button
                    type="button"
                    class="btn-secondary tw-min-w-0 tw-px-2 tw-py-1 tw-text-xs"
                    aria-label="Move run end one point later"
                    :disabled="runEndSlider.local.value >= maxIndex"
                    @click="nudgeRunEnd(1)"
                  >
                    +1
                  </button>
                </div>
              </div>
              <input
                id="run-end"
                type="range"
                :min="runStartSlider.local.value"
                :max="maxIndex"
                step="1"
                :value="runEndSlider.local.value"
                class="slider-control tw-mt-2 tw-w-full"
                @input="handleRunEndInput($event.target.value)"
                @change="handleRunEndChange($event.target.value)"
              >
              <p class="form-hint">
                {{ formatIndexLabel(runEndSlider.local.value) }} · trims trail-out
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
