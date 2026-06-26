<script setup>
import { ref } from 'vue';
import { ArrowDownTrayIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';

import { downloadGpx, writeGpx } from '@/lib/writeGpx';
import { useGpxStore } from '@/stores/gpxStore';

const gpxStore = useGpxStore();
const exportMessage = ref('');

function handleExport() {
  if (!gpxStore.canExport) return;

  const baseName = gpxStore.fileName.replace(/\.[^.]+$/, '');
  const gpxText = writeGpx(gpxStore.correctedRunPoints, {
    name: `${baseName} corrected`,
  });
  downloadGpx(gpxText, `${baseName}-corrected.gpx`);
  exportMessage.value = `Exported ${gpxStore.correctedRunPoints.length} points.`;

  setTimeout(() => {
    exportMessage.value = '';
  }, 4000);
}
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="export-heading"
  >
    <div class="dashboard-card-body tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
      <div>
        <h2
          id="export-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Export corrected GPX
        </h2>
        <p class="tw-mt-1 tw-max-w-2xl tw-text-sm tw-text-slate-500">
          Downloads only the selected run segment with corrected latitude and longitude.
          Timestamps and elevation are preserved for Strava upload.
        </p>
      </div>

      <button
        type="button"
        class="btn-primary tw-w-full sm:tw-w-auto"
        :disabled="!gpxStore.canExport"
        @click="handleExport"
      >
        <ArrowDownTrayIcon
          class="tw-h-4 tw-w-4"
          aria-hidden="true"
        />
        Download GPX
      </button>
    </div>

    <div
      v-if="exportMessage"
      class="tw-border-t tw-border-emerald-200 tw-bg-emerald-50 tw-px-4 tw-py-3 sm:tw-px-5"
      role="status"
    >
      <p class="tw-flex tw-items-center tw-gap-2 tw-text-sm tw-font-medium tw-text-emerald-800">
        <CheckCircleIcon
          class="tw-h-5 tw-w-5"
          aria-hidden="true"
        />
        {{ exportMessage }}
      </p>
    </div>
  </section>
</template>
