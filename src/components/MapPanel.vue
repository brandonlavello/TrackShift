<script setup>
import { computed } from 'vue';

import TrackPreviewSvg from '@/components/TrackPreviewSvg.vue';

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
  variant: {
    type: String,
    default: 'raw',
    validator: (value) => ['raw', 'corrected'].includes(value),
  },
});

const gridPatternId = computed(() => `map-grid-${props.variant}`);
const hasTrack = computed(() =>
  props.points.some((point) => point?.lat != null && (point?.lon ?? point?.lng) != null),
);
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
        <TrackPreviewSvg
          v-if="hasTrack"
          :points="points"
          :run-segment="runSegment"
          :variant="variant"
          :grid-id="gridPatternId"
          class="tw-h-auto tw-min-h-[220px] tw-w-full"
        />

        <div
          v-else
          class="tw-flex tw-min-h-[220px] tw-items-center tw-justify-center tw-p-6 tw-text-center"
        >
          <p class="tw-text-sm tw-text-slate-500">
            Upload a FIT or GPX file to preview the track.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
