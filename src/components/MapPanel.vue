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
  variant: {
    type: String,
    default: 'raw',
    validator: (value) => ['raw', 'corrected'].includes(value),
  },
  highlightSegment: {
    type: Object,
    default: null,
  },
  secondarySegment: {
    type: Object,
    default: null,
  },
  tertiarySegment: {
    type: Object,
    default: null,
  },
});

const viewBox = '0 0 400 280';

function readLon(point) {
  return point?.lon ?? point?.lng;
}

function projectPoints(points) {
  if (!points.length) {
    return { coords: [], bounds: null };
  }

  const positioned = points
    .map((point) => ({ point, lat: point.lat, lon: readLon(point) }))
    .filter((entry) => entry.lat != null && entry.lon != null);

  if (!positioned.length) {
    return { coords: [], bounds: null };
  }

  const lats = positioned.map((entry) => entry.lat);
  const lons = positioned.map((entry) => entry.lon);
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

  const coords = positioned.map((entry) => ({
    x: offsetX + (entry.lon - minLon) * metersPerDegLon * scale,
    y: offsetY + (maxLat - entry.lat) * metersPerDegLat * scale,
  }));

  return {
    coords,
    bounds: {
      minLat,
      maxLat,
      minLon,
      maxLon,
      pad,
      width,
      height,
      latSpanM,
      lonSpanM,
      scale,
      offsetX,
      offsetY,
      metersPerDegLat,
      metersPerDegLon,
    },
  };
}

const projectedTrack = computed(() => projectPoints(props.points));

const pathData = computed(() => {
  const { coords } = projectedTrack.value;
  if (!coords.length) return '';
  return `M ${coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' L ')}`;
});

const startMarker = computed(() => projectedTrack.value.coords[0] ?? null);
const endMarker = computed(() => projectedTrack.value.coords.at(-1) ?? null);

const segmentPath = computed(() => buildSegmentPath(props.highlightSegment));
const secondarySegmentPath = computed(() => buildSegmentPath(props.secondarySegment));
const tertiarySegmentPath = computed(() => buildSegmentPath(props.tertiarySegment));

function buildSegmentPath(segment) {
  if (!segment || !props.points.length) return '';

  const { start, end } = segment;
  const segmentPoints = props.points.slice(start, end + 1);
  if (!segmentPoints.length) return '';

  const { bounds } = projectedTrack.value;
  if (!bounds) return '';

  const coords = segmentPoints
    .map((point) => ({ lat: point.lat, lon: readLon(point) }))
    .filter((entry) => entry.lat != null && entry.lon != null)
    .map((entry) => {
      const x =
        bounds.offsetX + (entry.lon - bounds.minLon) * bounds.metersPerDegLon * bounds.scale;
      const y =
        bounds.offsetY + (bounds.maxLat - entry.lat) * bounds.metersPerDegLat * bounds.scale;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

  return coords.length ? `M ${coords.join(' L ')}` : '';
}

const strokeColor = computed(() =>
  props.variant === 'corrected' ? '#1d65f1' : '#64748b',
);

const hasTrack = computed(() => projectedTrack.value.coords.length > 0);
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
              id="grid"
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
            fill="url(#grid)"
          />
          <path
            v-if="tertiarySegmentPath"
            :d="tertiarySegmentPath"
            fill="none"
            stroke="#fb923c"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.2"
          />
          <path
            v-if="secondarySegmentPath"
            :d="secondarySegmentPath"
            fill="none"
            stroke="#f97316"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.25"
          />
          <path
            v-if="segmentPath"
            :d="segmentPath"
            fill="none"
            stroke="#f59e0b"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.35"
          />
          <path
            :d="pathData"
            fill="none"
            :stroke="strokeColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle
            v-if="startMarker"
            :cx="startMarker.x"
            :cy="startMarker.y"
            r="5"
            fill="#10b981"
          />
          <circle
            v-if="endMarker"
            :cx="endMarker.x"
            :cy="endMarker.y"
            r="5"
            fill="#ef4444"
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
          class="tw-absolute tw-bottom-2 tw-left-2 tw-flex tw-gap-3 tw-rounded-md tw-bg-white/90 tw-px-2 tw-py-1 tw-text-[10px] tw-text-slate-600 tw-backdrop-blur"
        >
          <span class="tw-flex tw-items-center tw-gap-1">
            <span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-emerald-500" />
            Start
          </span>
          <span class="tw-flex tw-items-center tw-gap-1">
            <span class="tw-inline-block tw-h-2 tw-w-2 tw-rounded-full tw-bg-red-500" />
            End
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
