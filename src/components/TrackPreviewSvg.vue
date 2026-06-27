<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: {
    type: Array,
    default: () => [],
  },
  runSegment: {
    type: Object,
    default: null,
  },
  variant: {
    type: String,
    default: 'corrected',
    validator: (value) => ['raw', 'corrected'].includes(value),
  },
  showLegend: {
    type: Boolean,
    default: true,
  },
  gridId: {
    type: String,
    default: 'track-preview-grid',
  },
});

const viewBox = '0 0 400 280';
const TRIM_STROKE = '#cbd5e1';
const RAW_RUN_STROKE = '#475569';
const CORRECTED_RUN_STROKE = '#1d65f1';

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

const projection = computed(() => buildProjection([props.points]));
const pointCoords = computed(() => props.points.map((point) => projection.value.project(point)));
const isRawWithTrim = computed(() => props.variant === 'raw' && props.runSegment != null);
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
  if (!isRawWithTrim.value || runStart.value <= 0) return '';
  return pathForRange(pointCoords.value, 0, runStart.value - 1);
});

const trimAfterPath = computed(() => {
  if (!isRawWithTrim.value || runEnd.value >= props.points.length - 1) return '';
  return pathForRange(pointCoords.value, runEnd.value + 1, props.points.length - 1);
});

const runPath = computed(() => {
  if (props.variant === 'corrected') {
    return coordsToPath(pointCoords.value);
  }
  return pathForRange(pointCoords.value, runStart.value, runEnd.value);
});

const runStartMarker = computed(() => pointCoords.value[runStart.value] ?? pointCoords.value[0] ?? null);
const runEndMarker = computed(() =>
  pointCoords.value[runEnd.value] ?? pointCoords.value.at(-1) ?? null,
);

const hasTrack = computed(() => pointCoords.value.some(Boolean));
const hasTrim = computed(() => isRawWithTrim.value && Boolean(trimBeforePath.value || trimAfterPath.value));
</script>

<template>
  <div class="tw-relative tw-h-full tw-w-full">
    <svg
      v-if="hasTrack"
      :viewBox="viewBox"
      class="tw-h-full tw-w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <pattern
          :id="gridId"
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
        :fill="`url(#${gridId})`"
      />
      <path
        v-if="isRawWithTrim && trimBeforePath"
        :d="trimBeforePath"
        fill="none"
        :stroke="TRIM_STROKE"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="5 4"
      />
      <path
        v-if="isRawWithTrim && trimAfterPath"
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
      class="tw-flex tw-h-full tw-min-h-[80px] tw-items-center tw-justify-center tw-p-4 tw-text-center"
    >
      <p class="tw-text-xs tw-text-slate-500">
        No track preview
      </p>
    </div>

    <div
      v-if="showLegend && hasTrack"
      class="tw-absolute tw-bottom-1 tw-left-1 tw-flex tw-flex-wrap tw-gap-x-2 tw-gap-y-0.5 tw-rounded tw-bg-white/90 tw-px-1.5 tw-py-0.5 tw-text-[9px] tw-text-slate-600 tw-backdrop-blur"
    >
      <span class="tw-flex tw-items-center tw-gap-0.5">
        <span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-emerald-500" />
        Start
      </span>
      <span class="tw-flex tw-items-center tw-gap-0.5">
        <span class="tw-inline-block tw-h-1.5 tw-w-1.5 tw-rounded-full tw-bg-red-500" />
        End
      </span>
      <span
        v-if="hasTrim"
        class="tw-flex tw-items-center tw-gap-0.5"
      >
        <span
          class="tw-inline-block tw-h-0.5 tw-w-2 tw-border-t tw-border-dashed tw-border-slate-300"
          aria-hidden="true"
        />
        Trim
      </span>
    </div>
  </div>
</template>
