<script setup>
import { version } from '../../package.json';

import StatsForNerds from '@/components/StatsForNerds.vue';

const repoUrl = 'https://github.com/brandonlavello/TrackShift';
const repoGuideUrl = `${repoUrl}#recording-on-a-cruise-ship`;
const siteUrl = 'https://brandonlavello.com';
const year = new Date().getFullYear();

/** Set true to show the footer reference-frame Easter egg. */
const showStatsForNerds = false;
</script>

<template>
  <footer class="tw-border-t tw-border-slate-200 tw-bg-white">
    <div
      class="tw-mx-auto tw-max-w-7xl tw-space-y-6 tw-px-4 tw-py-8 sm:tw-px-6 lg:tw-px-8"
    >
      <div class="tw-grid tw-gap-6 sm:tw-grid-cols-2 lg:tw-grid-cols-3">
        <div>
          <p class="tw-text-sm tw-font-semibold tw-text-slate-900">
            TrackShift
          </p>
          <p class="tw-mt-1 tw-text-xs tw-leading-relaxed tw-text-slate-500">
            Correct FIT and GPX tracks recorded on a moving ship. Free, open source, and
            client-side only.
          </p>
        </div>

        <div>
          <p class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
            Links
          </p>
          <ul class="tw-mt-2 tw-space-y-1.5 tw-text-xs">
            <li>
              <a
                :href="repoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tw-text-slate-600 tw-underline-offset-2 hover:tw-text-brand-600 hover:tw-underline"
              >
                Source on GitHub
              </a>
            </li>
            <li>
              <a
                :href="repoGuideUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tw-text-slate-600 tw-underline-offset-2 hover:tw-text-brand-600 hover:tw-underline"
              >
                How to use (README)
              </a>
            </li>
            <li>
              <a
                :href="`${repoUrl}/issues`"
                target="_blank"
                rel="noopener noreferrer"
                class="tw-text-slate-600 tw-underline-offset-2 hover:tw-text-brand-600 hover:tw-underline"
              >
                Report an issue
              </a>
            </li>
            <li>
              <a
                href="https://github.com/brandonlavello/TrackShift/blob/main/LICENSE"
                target="_blank"
                rel="noopener noreferrer"
                class="tw-text-slate-600 tw-underline-offset-2 hover:tw-text-brand-600 hover:tw-underline"
              >
                MIT License
              </a>
            </li>
          </ul>
        </div>

        <div class="sm:tw-col-span-2 lg:tw-col-span-1">
          <p class="tw-text-xs tw-font-semibold tw-uppercase tw-tracking-wide tw-text-slate-500">
            Privacy &amp; disclaimer
          </p>
          <ul class="tw-mt-2 tw-space-y-1.5 tw-text-xs tw-leading-relaxed tw-text-slate-500">
            <li>Files are parsed in your browser and never uploaded to a server.</li>
            <li>
              The hosted demo may use
              <a
                href="https://www.cloudflare.com/web-analytics/"
                target="_blank"
                rel="noopener noreferrer"
                class="tw-underline-offset-2 hover:tw-text-slate-700 hover:tw-underline"
              >Cloudflare Web Analytics</a>
              for anonymous traffic metrics.
            </li>
            <li>Not affiliated with Garmin, Strava, or any cruise line.</li>
            <li>Ship motion estimates are approximate — not for navigation or safety.</li>
          </ul>
        </div>
      </div>

      <StatsForNerds v-if="showStatsForNerds" />

      <div
        class="tw-flex tw-flex-col tw-gap-1 tw-border-t tw-border-slate-100 tw-pt-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
      >
        <p class="tw-text-[11px] tw-text-slate-400">
          © {{ year }}
          <a
            :href="siteUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="tw-underline-offset-2 hover:tw-text-slate-600 hover:tw-underline"
          >
            Brandon Lavello
          </a>
          · v{{ version }}
        </p>
        <p class="tw-text-[11px] tw-text-slate-400">
          Open source under
          <a
            :href="`${repoUrl}/blob/main/LICENSE`"
            class="tw-underline-offset-2 hover:tw-text-slate-600 hover:tw-underline"
          >
            MIT
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>
