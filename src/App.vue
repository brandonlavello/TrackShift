<script setup>
import AppHeader from '@/components/AppHeader.vue';
import CorrectionControls from '@/components/CorrectionControls.vue';
import ExportButton from '@/components/ExportButton.vue';
import FitInspector from '@/components/FitInspector.vue';
import GpxUploader from '@/components/GpxUploader.vue';
import MapPanel from '@/components/MapPanel.vue';
import QualityMetrics from '@/components/QualityMetrics.vue';
import StatsPanel from '@/components/StatsPanel.vue';
import TimelinePanel from '@/components/TimelinePanel.vue';
import AppFooter from '@/components/AppFooter.vue';
import { useGpxStore } from '@/stores/gpxStore';

const gpxStore = useGpxStore();
</script>

<template>
  <div class="tw-min-h-screen">
    <AppHeader />

    <main class="tw-mx-auto tw-max-w-7xl tw-space-y-6 tw-px-4 tw-py-6 sm:tw-px-6 lg:tw-px-8">
      <GpxUploader />

      <div class="tw-grid tw-gap-6 lg:tw-grid-cols-2">
        <MapPanel
          title="Raw track"
          subtitle="Full GPS activity as recorded"
          :points="gpxStore.allPoints"
          variant="raw"
          :highlight-segment="gpxStore.segments.run"
          :secondary-segment="gpxStore.trimBefore"
          :tertiary-segment="gpxStore.trimAfter"
        />
        <MapPanel
          title="Corrected track"
          subtitle="Ship motion subtracted from selected run"
          :points="gpxStore.correctedRunPoints"
          variant="corrected"
        />
      </div>

      <div class="tw-grid tw-gap-6 xl:tw-grid-cols-3">
        <div class="xl:tw-col-span-2">
          <TimelinePanel />
        </div>
        <CorrectionControls />
      </div>

      <div class="tw-grid tw-gap-6 lg:tw-grid-cols-2">
        <StatsPanel />
        <QualityMetrics />
      </div>

      <FitInspector />
      <ExportButton />
    </main>

    <AppFooter />
  </div>
</template>
