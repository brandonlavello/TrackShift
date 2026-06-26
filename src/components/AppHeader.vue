<script setup>
import { MapPinIcon } from '@heroicons/vue/24/outline';

import UnitToggle from '@/components/UnitToggle.vue';
</script>

<template>
  <header class="tw-border-b tw-border-surface-border tw-bg-white">
    <div
      class="tw-mx-auto tw-flex tw-max-w-7xl tw-flex-col tw-gap-3 tw-px-4 tw-py-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between sm:tw-px-6 lg:tw-px-8"
    >
      <div class="tw-flex tw-items-start tw-gap-3">
        <div
          class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-600 tw-text-white"
          aria-hidden="true"
        >
          <MapPinIcon class="tw-h-5 tw-w-5" />
        </div>
        <div>
          <p class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wider tw-text-brand-600">
            Client-side tool
          </p>
          <h1 class="tw-text-xl tw-font-bold tw-text-slate-900 sm:tw-text-2xl">
            TrackShift
          </h1>
          <p class="tw-mt-0.5 tw-max-w-xl tw-text-sm tw-text-slate-600">
            Correct GPS tracks recorded on a moving ship. All processing stays in your browser.
          </p>
        </div>
      </div>

      <div class="tw-flex tw-flex-wrap tw-items-center tw-gap-2">
        <UnitToggle />
        <span
          class="tw-inline-flex tw-items-center tw-rounded-full tw-bg-emerald-50 tw-px-3 tw-py-1 tw-text-xs tw-font-medium tw-text-emerald-700 tw-ring-1 tw-ring-inset tw-ring-emerald-600/20"
        >
          No upload · No account
        </span>
      </div>
    </div>
  </header>
</template>
