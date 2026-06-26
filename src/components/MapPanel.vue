<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  points: {
    type: Array,
    default: () => [],
  },
  runSegment: {
    type: Object,
    default: null,
  },
  correctedRunPoints: {
    type: Array,
    default: () => [],
  },
  variant: {
    type: String,
    default: 'raw',
    validator: (value) => ['raw', 'corrected'].includes(value),
  },
});

const viewBox = '0 0 400 280';
const TRIM_STROKE = '#cbd5e1';
const RAW_RUN_STROKE = '#475569';
const CORRECTED_RUN_STROKE = '#1d65f1';

const gridPatternId = computed(() => `map-grid-${props.variant}`);

function readLon(point) {
  return point?.lon ?? point?.lng;
}

function buildProjection(pointSets) {
  const entries = [];
  for (const points of pointSets) {
    for (const point of points) {
      if (point?.lat != null && readLon(point) != null) {
        entries.push({ lat: point.lat, lon: readLon(point) });
      }
    }
  }

  if (!entries.length) {
    return { project: () => null };
  }

  const lats = entries.map((entry) => entry.lat);
  const lons = entries.map((entry) => entry.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const pad = 24;
  const width = 400 - pad * 2;
  const height = 280 - pad * 2;
  const midLat = (minLat + maxLat) / 2;
  const metersPerDegLat = 111_320;
  const metersPerDegLon = metersPerDegLat * Math.cos((midLat * Math.PI) / 180);
  const latSpanM = Math.max((maxLat - minLat) * metersPerDegLat, 1);
  const lonSpanM = Math.max((maxLon - minLon) * metersPerDegLon, 1);
  const scale = Math.min(width / lonSpanM, height / latSpanM);
  const drawW = lonSpanM * scale;
  const drawH = latSpanM * scale;
  const offsetX = pad + (width - drawW) / 2;
  const offsetY = pad + (height - drawH) / 2;

  return {
    project(point) {
      if (point?.lat == null || readLon(point) == null) return null;
      return {
        x: offsetX + (readLon(point) - minLon) * metersPerDegLon * scale,
        y: offsetY + (maxLat - point.lat) * metersPerDegLat * scale,
      };
    },
  };
}

const projection = computed(() => {
  const sets = [props.points];
  if (props.variant === 'corrected' && props.correctedRunPoints.length) {
    sets.push(props.correctedRunPoints);
  }
  return buildProjection(sets);
});

const pointCoords = computed(() => props.points.map((point) => projection.value.project(point)));

const correctedCoords = computed(() =>
  props.correctedRunPoints.map((point) => projection.value.project(point)),
);

const runStart = computed(() => props.runSegment?.start ?? 0);
const runEnd = computed(() =>
  props.runSegment?.end ?? Math.max(props.points.length - 1, 0),
);

function coordsToPath(coords) {
  const valid = coords.filter(Boolean);
  if (!valid.length) return '';
  return `M ${valid.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
}

function pathForRange(coords, start, end) {
  if (end < start) return '';
  return coordsToPath(coords.slice(start, end + 1));
}

const trimBeforePath = computed(() => {
  if (runStart.value <= 0) return '';
  return pathForRange(pointCoords.value, 0, runStart.value - 1);
});

const trimAfterPath = computed(() => {
  if (runEnd.value >= props.points.length - 1) return '';
  return pathForRange(pointCoords.value, runEnd.value + 1, props.points.length - 1);
});

const runPath = computed(() => {
  if (props.variant === 'corrected') {
    return coordsToPath(correctedCoords.value);
  }
  return pathForRange(pointCoords.value, runStart.value, runEnd.value);
});

const runStartMarker = computed(() => {
  if (props.variant === 'corrected') {
    return correctedCoords.value[0] ?? pointCoords.value[runStart.value] ?? null;
  }
  return pointCoords.value[runStart.value] ?? null;
});

const runEndMarker = computed(() => {
  if (props.variant === 'corrected') {
    return correctedCoords.value.at(-1) ?? pointCoords.value[runEnd.value] ?? null;
  }
  return pointCoords.value[runEnd.value] ?? null;
});

const hasTrack = computed(() => pointCoords.value.some(Boolean));
const hasTrim = computed(() => Boolean(trimBeforePath.value || trimAfterPath.value));
</script>

<template>
  <section
    class="dashboard-card tw-h-full"
    :aria-label="`${title} map`"
  >
    <div class="dashboard-card-header">
      <div>
        <h3 class="tw-text-sm tw-font-semibold tw-text-slate-900">
          {{ title }}
        </h3>
        <p
          v-if="subtitle"
          class="tw-mt-0.5 tw-text-xs tw-text-slate-500"
        >
          {{ subtitle }}
        </p>
      </div>
      <span
        class="tw-inline-flex tw-items-center tw-rounded-full tw-px-2.5 tw-py-0.5 tw-text-xs tw-font-medium"
        :class="
          variant === 'corrected'
            ? 'tw-bg-brand-50 tw-text-brand-700'
            : 'tw-bg-slate-100 tw-text-slate-600'
        "
      >
        {{ variant === 'corrected' ? 'Corrected' : 'Raw GPS' }}
      </span>
    </div>

    <div class="dashboard-card-body">
      <div
        class="tw-relative tw-overflow-hidden tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-100"
        role="img"
        :aria-label="hasTrack ? `${title} track preview` : 'No track loaded'"
      >
        <svg
          v-if="hasTrack"
          :viewBox="viewBox"
          class="tw-h-auto tw-w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              :id="gridPatternId"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#cbd5e1"
                stroke-width="0.5"
              />
            </pattern>
          </defs>
          <rect
            width="400"
            height="280"
            :fill="`url(#${gridPatternId})`"
          />
          <path
            v-if="trimBeforePath"
            :d="trimBeforePath"
            fill="none"
            :stroke="TRIM_STROKE"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="5 4"
          />
          <path
            v-if="trimAfterPath"
            :d="trimAfterPath"
            fill="none"
            :stroke="TRIM_STROKE"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-dasharray="5 4"
          />
          <path
            v-if="runPath"
            :d="runPath"
            fill="none"
            :stroke="variant === 'corrected' ? CORRECTED_RUN_STROKE : RAW_RUN_STROKE"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-if="runStartMarker"
            :cx="runStartMarker.x"
            :cy="runStartMarker.y"
            r="5"
            fill="#10b981"
            stroke="#fff"
            stroke-width="1.5"
          />
          <circle
            v-if="runEndMarker"
            :cx="runEndMarker.x"
            :cy="runEndMarker.y"
            r="5"
            fill="#ef4444"
            stroke="#fff"
            stroke-width="1.5"
          />
        </svg>

        <div
          v-else
          class="tw-flex tw-min-h-[220px] tw-items-center tw-justify-center tw-p-6 tw-text-center"
        >
          <p class="tw-text-sm tw-text-slate-500">
            Upload a FIT or GPX file to preview the track.
          </p>
        </div>

        <div
          v-if="hasTrack"
          class="tw-absolute tw-bottom-2 tw-left-2 tw-flex tw-flex-wrap tw-gap-x-3 tw-gap-y-1 tw-rounded-md tw-bg-white/90 tw-px-2 tw-py-1 tw-text-[10px] tw-text-slate-600 tw-backdrop-blur"
        >
          <span class="tw-flex tw-items-center tw-gap-1">
            <span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-emerald-500" />
            Run start
          </span>
          <span class="tw-flex tw-items-center tw-gap-1">
            <span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-red-500" />
            Run end
          </span>
          <span
            v-if="hasTrim"
            class="tw-flex tw-items-center tw-gap-1"
          >
            <span
              class="tw-inline-block tw-h-0.5 tw-w-3 tw-border-t tw-border-dashed tw-border-slate-300"
              aria-hidden="true"
            />
            Trimmed
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
