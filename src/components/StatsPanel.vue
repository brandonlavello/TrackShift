<script setup>
import { computed } from 'vue';

import {
  formatDistance,
  formatDuration,
  formatPacePerKm,
  formatSpeedKph,
  paceUnitLabel,
} from '@/lib/format';
import { paceSecondsPerKm } from '@/lib/distance';
import { useGpxStore } from '@/stores/gpxStore';
import { useUnitStore } from '@/stores/unitStore';

const gpxStore = useGpxStore();
const unitStore = useUnitStore();

const unit = computed(() => unitStore.distanceUnit);
const paceSuffix = computed(() => paceUnitLabel(unit.value));

const rows = computed(() => {
  const rawPace = formatPacePerKm(
    paceSecondsPerKm(
      gpxStore.stats.raw.distanceMeters,
      gpxStore.stats.raw.elapsedSeconds,
    ),
    unit.value,
  );
  const correctedPace = formatPacePerKm(
    paceSecondsPerKm(
      gpxStore.stats.corrected.distanceMeters,
      gpxStore.stats.corrected.elapsedSeconds,
    ),
    unit.value,
  );

  return [
    {
      label: 'GPS distance',
      raw: formatDistance(gpxStore.stats.raw.distanceMeters, unit.value),
      corrected: formatDistance(gpxStore.stats.corrected.distanceMeters, unit.value),
    },
    {
      label: 'Elapsed time',
      raw: formatDuration(gpxStore.stats.raw.elapsedSeconds),
      corrected: formatDuration(gpxStore.stats.corrected.elapsedSeconds),
    },
    {
      label: 'Average pace',
      raw: `${rawPace} ${paceSuffix.value}`,
      corrected: `${correctedPace} ${paceSuffix.value}`,
    },
    {
      label: 'Average speed',
      raw: formatSpeedKph(gpxStore.stats.raw.avgSpeedKph, unit.value),
      corrected: formatSpeedKph(gpxStore.stats.corrected.avgSpeedKph, unit.value),
    },
    {
      label: 'Point count',
      raw: gpxStore.stats.raw.pointCount.toLocaleString(),
      corrected: gpxStore.stats.corrected.pointCount.toLocaleString(),
    },
  ];
});

const metaStats = computed(() => [
  { label: 'Source', value: gpxStore.stats.source },
  {
    label: 'Device distance',
    value: formatDistance(gpxStore.stats.raw.deviceDistanceMeters, unit.value),
  },
]);

const correctionInfo = computed(() => [
  {
    label: 'Ship speed',
    value: `${gpxStore.stats.correction.shipSpeedKnots.toFixed(1)} kn`,
  },
  {
    label: 'Ship heading',
    value: `${gpxStore.stats.correction.shipHeadingDeg}°`,
  },
  {
    label: 'Correction strength',
    value: `${gpxStore.stats.correction.strengthPercent}%`,
  },
  {
    label: 'Trimmed distance',
    value: formatDistance(gpxStore.stats.correction.trimmedDistanceMeters, unit.value),
  },
]);
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="stats-heading"
  >
    <div class="dashboard-card-header">
      <div>
        <h2
          id="stats-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Statistics
        </h2>
        <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
          Compare raw GPS against the corrected run segment.
        </p>
      </div>
    </div>

    <div class="dashboard-card-body tw-space-y-6">
      <div
        v-if="!gpxStore.isReady"
        class="tw-rounded-lg tw-bg-slate-50 tw-p-4 tw-text-sm tw-text-slate-500"
      >
        Statistics appear after an activity file is loaded.
      </div>

      <template v-else>
        <dl class="tw-grid tw-grid-cols-2 tw-gap-3">
          <div
            v-for="item in metaStats"
            :key="item.label"
            class="tw-rounded-lg tw-bg-slate-50 tw-p-3"
          >
            <dt class="stat-label">
              {{ item.label }}
            </dt>
            <dd class="stat-value tw-text-base">
              {{ item.value }}
            </dd>
          </div>
        </dl>

        <div class="tw-overflow-x-auto">
          <table class="tw-min-w-full tw-text-left tw-text-sm">
            <thead>
              <tr class="tw-border-b tw-border-slate-200 tw-text-xs tw-uppercase tw-tracking-wide tw-text-slate-500">
                <th
                  scope="col"
                  class="tw-pb-3 tw-pr-4 tw-font-medium"
                >
                  Metric
                </th>
                <th
                  scope="col"
                  class="tw-pb-3 tw-pr-4 tw-font-medium"
                >
                  Raw
                </th>
                <th
                  scope="col"
                  class="tw-pb-3 tw-font-medium"
                >
                  Corrected
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.label"
                class="tw-border-b tw-border-slate-100 last:tw-border-0"
              >
                <th
                  scope="row"
                  class="tw-py-3 tw-pr-4 tw-font-medium tw-text-slate-700"
                >
                  {{ row.label }}
                </th>
                <td class="tw-py-3 tw-pr-4 tw-tabular-nums tw-text-slate-600">
                  {{ row.raw }}
                </td>
                <td class="tw-py-3 tw-tabular-nums tw-font-medium tw-text-slate-900">
                  {{ row.corrected }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h3 class="tw-text-sm tw-font-semibold tw-text-slate-800">
            Correction settings
          </h3>
          <dl class="tw-mt-3 tw-grid tw-grid-cols-2 tw-gap-3 sm:tw-grid-cols-4">
            <div
              v-for="item in correctionInfo"
              :key="item.label"
              class="tw-rounded-lg tw-bg-slate-50 tw-p-3"
            >
              <dt class="stat-label">
                {{ item.label }}
              </dt>
              <dd class="stat-value tw-text-base">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </div>
      </template>
    </div>
  </section>
</template>
