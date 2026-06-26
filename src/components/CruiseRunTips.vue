<script setup>
import { ref, watch } from 'vue';
import {
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline';

import { useGpxStore } from '@/stores/gpxStore';

const gpxStore = useGpxStore();
const isOpen = ref(false);

const repoGuideUrl =
  'https://github.com/brandonlavello/TrackShift#recording-on-a-cruise-ship';

const recordingSteps = [
  {
    title: 'Start your watch',
    detail: 'On the open promenade or jogging track — clear sky helps GPS.',
  },
  {
    title: 'Stand or walk slowly ~30s',
    detail: 'Lead-in before you run. Slow movement counts; you do not need to freeze.',
  },
  {
    title: 'Run your laps',
    detail: 'Normal deck run. Steady ship speed and heading give the best estimate.',
  },
  {
    title: 'Cool down ~30s',
    detail: 'Stand or walk before stopping the watch. This tail is the most important trim.',
  },
  {
    title: 'Upload your .fit file',
    detail: 'Garmin FIT preferred. Export corrected GPX to Strava when it looks right.',
  },
];

const appSteps = [
  {
    title: 'Check trim & maps',
    detail: 'Grey dashed lines are lead-in/trail-out. Green and red mark run start and end.',
  },
  {
    title: 'Review the estimate',
    detail: 'Use Quality Metrics and correction sliders if confidence is Fair or Low.',
  },
  {
    title: 'Export corrected GPX',
    detail: 'Download and upload to Strava or your platform of choice.',
  },
];

const weakerResults = [
  'Stopping the watch the instant you finish (no cool-down)',
  'Hard ship turns or speed changes during the run',
  'GPS under cover or between decks',
  'Very short runs with little trim data at the edges',
];

watch(
  () => gpxStore.hasFile,
  (hasFile) => {
    if (hasFile) isOpen.value = false;
  },
);

function toggle() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="cruise-tips-heading"
  >
    <button
      type="button"
      class="dashboard-card-header tw-w-full tw-text-left tw-transition hover:tw-bg-slate-50/80"
      :aria-expanded="isOpen"
      aria-controls="cruise-tips-panel"
      @click="toggle"
    >
      <div class="tw-flex tw-min-w-0 tw-flex-1 tw-items-start tw-gap-3">
        <div
          class="tw-flex tw-h-9 tw-w-9 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-brand-50 tw-text-brand-600 tw-ring-1 tw-ring-inset tw-ring-brand-100"
          aria-hidden="true"
        >
          <InformationCircleIcon class="tw-h-5 tw-w-5" />
        </div>
        <div class="tw-min-w-0">
          <h2
            id="cruise-tips-heading"
            class="tw-text-base tw-font-semibold tw-text-slate-900"
          >
            How to use · Cruise runs
          </h2>
          <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
            Record with ~30s before and after your run for the best ship-motion estimate.
          </p>
        </div>
      </div>
      <ChevronUpIcon
        v-if="isOpen"
        class="tw-h-5 tw-w-5 tw-shrink-0 tw-text-slate-400"
        aria-hidden="true"
      />
      <ChevronDownIcon
        v-else
        class="tw-h-5 tw-w-5 tw-shrink-0 tw-text-slate-400"
        aria-hidden="true"
      />
    </button>

    <div
      v-show="isOpen"
      id="cruise-tips-panel"
      class="dashboard-card-body tw-space-y-6 tw-border-t tw-border-surface-border"
    >
      <div class="tw-grid tw-gap-6 lg:tw-grid-cols-2">
        <div>
          <h3 class="tw-text-sm tw-font-semibold tw-text-slate-800">
            On the ship
          </h3>
          <ol class="tw-mt-3 tw-space-y-3">
            <li
              v-for="(step, index) in recordingSteps"
              :key="step.title"
              class="tw-flex tw-gap-3"
            >
              <span
                class="tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-brand-600 tw-text-xs tw-font-semibold tw-text-white"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              <div class="tw-min-w-0">
                <p class="tw-text-sm tw-font-medium tw-text-slate-900">
                  {{ step.title }}
                </p>
                <p class="tw-mt-0.5 tw-text-xs tw-leading-relaxed tw-text-slate-500">
                  {{ step.detail }}
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div>
          <h3 class="tw-text-sm tw-font-semibold tw-text-slate-800">
            In TrackShift
          </h3>
          <ol class="tw-mt-3 tw-space-y-3">
            <li
              v-for="(step, index) in appSteps"
              :key="step.title"
              class="tw-flex tw-gap-3"
            >
              <span
                class="tw-flex tw-h-6 tw-w-6 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-full tw-bg-slate-200 tw-text-xs tw-font-semibold tw-text-slate-700"
                aria-hidden="true"
              >
                {{ index + 1 }}
              </span>
              <div class="tw-min-w-0">
                <p class="tw-text-sm tw-font-medium tw-text-slate-900">
                  {{ step.title }}
                </p>
                <p class="tw-mt-0.5 tw-text-xs tw-leading-relaxed tw-text-slate-500">
                  {{ step.detail }}
                </p>
              </div>
            </li>
          </ol>

          <div
            class="tw-mt-4 tw-rounded-lg tw-border tw-border-slate-200 tw-bg-slate-50 tw-p-3"
          >
            <p class="tw-text-xs tw-font-medium tw-text-slate-700">
              About the track previews
            </p>
            <p class="tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
              Maps are schematic — shape and lap closure, not a geographic basemap.
              On open water a real map would mostly show ocean anyway.
            </p>
          </div>
        </div>
      </div>

      <div
        class="tw-rounded-lg tw-border tw-border-amber-200 tw-bg-amber-50 tw-p-4"
        role="note"
      >
        <p class="tw-text-sm tw-font-medium tw-text-amber-900">
          When results may be weaker
        </p>
        <ul class="tw-mt-2 tw-space-y-1.5 tw-text-xs tw-leading-relaxed tw-text-amber-800">
          <li
            v-for="item in weakerResults"
            :key="item"
            class="tw-flex tw-gap-2"
          >
            <span
              class="tw-mt-1.5 tw-h-1 tw-w-1 tw-shrink-0 tw-rounded-full tw-bg-amber-500"
              aria-hidden="true"
            />
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>

      <p class="tw-flex tw-flex-wrap tw-items-center tw-gap-x-2 tw-gap-y-1 tw-text-xs tw-text-slate-500">
        <span>Full guide, limitations, and developer docs:</span>
        <a
          :href="repoGuideUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="tw-inline-flex tw-items-center tw-gap-1 tw-font-medium tw-text-brand-600 tw-underline-offset-2 hover:tw-text-brand-700 hover:tw-underline"
        >
          README on GitHub
          <ArrowTopRightOnSquareIcon
            class="tw-h-3.5 tw-w-3.5"
            aria-hidden="true"
          />
        </a>
      </p>
    </div>
  </section>
</template>
