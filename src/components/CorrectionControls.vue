<script setup>
import { computed, ref } from "vue";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/vue/24/solid";
import { MinusCircleIcon } from "@heroicons/vue/24/outline";

import { useSliderControl } from "@/composables/useSliderControl";
import { useGpxStore } from "@/stores/gpxStore";

const gpxStore = useGpxStore();
const fineTune = ref(false);

const steps = computed(() =>
  fineTune.value
    ? { speed: 0.01, heading: 0.5, strength: 0.5 }
    : { speed: 0.25, heading: 2, strength: 2 },
);

const speedSlider = useSliderControl(
  () => gpxStore.correction.shipSpeedKnots,
  (value) => gpxStore.updateCorrection({ shipSpeedKnots: value }),
  { debounceMs: 0 },
);

const headingSlider = useSliderControl(
  () => gpxStore.correction.shipHeadingDeg,
  (value) => gpxStore.updateCorrection({ shipHeadingDeg: value }),
  { debounceMs: 0 },
);

const strengthSlider = useSliderControl(
  () => gpxStore.correction.strengthPercent,
  (value) => gpxStore.updateCorrection({ strengthPercent: value }),
  { debounceMs: 0 },
);

const headingLabel = computed(() => {
  const normalized = ((headingSlider.local.value % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  const precision = fineTune.value ? 1 : 0;
  return `${normalized.toFixed(precision)}° (${directions[index]})`;
});

const correctionState = computed(() => {
  if (!gpxStore.hasEstimate) return "no-estimate";
  if (gpxStore.isEstimateApplied) return "applied";
  if (gpxStore.canReapplyEstimate) return "adjusted";
  if (gpxStore.correction.shipSpeedKnots === 0) return "zero";
  return "available";
});

const modeBadge = computed(() => {
  switch (correctionState.value) {
    case "applied":
      return {
        label: "Estimate applied",
        class:
          "tw-bg-emerald-50 tw-text-emerald-800 tw-ring-1 tw-ring-emerald-200",
      };
    case "adjusted":
      return {
        label: "Manually adjusted",
        class: "tw-bg-amber-50 tw-text-amber-900 tw-ring-1 tw-ring-amber-200",
      };
    case "no-estimate":
      return {
        label: "No ship motion",
        class: "tw-bg-slate-100 tw-text-slate-600 tw-ring-1 tw-ring-slate-200",
      };
    case "zero":
      return {
        label: "Correction off",
        class: "tw-bg-slate-100 tw-text-slate-600 tw-ring-1 tw-ring-slate-200",
      };
    default:
      return {
        label: "Estimate ready",
        class: "tw-bg-brand-50 tw-text-brand-700 tw-ring-1 tw-ring-brand-200",
      };
  }
});

const statusPanel = computed(() => {
  const estimate = gpxStore.estimatedCorrection;

  switch (correctionState.value) {
    case "no-estimate":
      return {
        container: "tw-border-slate-200 tw-bg-slate-50",
        icon: MinusCircleIcon,
        iconClass: "tw-text-slate-400",
        title: "No ship motion detected",
        subtitle:
          "Widen the run window to leave more standing-still time at the start or end.",
        showEstimate: false,
      };
    case "applied":
      return {
        container: "tw-border-emerald-200 tw-bg-emerald-50",
        icon: CheckCircleIcon,
        iconClass: "tw-text-emerald-600",
        title: "Estimate applied",
        subtitle:
          estimate?.message ?? "Correction is active on the preview map.",
        showEstimate: true,
      };
    case "adjusted":
      return {
        container: "tw-border-amber-200 tw-bg-amber-50",
        icon: ExclamationTriangleIcon,
        iconClass: "tw-text-amber-600",
        title: "Sliders changed from estimate",
        subtitle: "Re-apply the estimate or keep your manual values.",
        showEstimate: true,
      };
    case "zero":
      return {
        container: "tw-border-slate-200 tw-bg-slate-50",
        icon: MinusCircleIcon,
        iconClass: "tw-text-slate-400",
        title: "Correction turned off",
        subtitle:
          estimate?.message ??
          "Move sliders or re-apply the estimate to correct the track.",
        showEstimate: true,
      };
    default:
      return {
        container: "tw-border-brand-200 tw-bg-brand-50/50",
        icon: SparklesIcon,
        iconClass: "tw-text-brand-600",
        title: "Estimate ready",
        subtitle:
          estimate?.message ??
          "Apply the estimate or fine-tune with the sliders.",
        showEstimate: true,
      };
  }
});

const confidenceBadge = computed(() => {
  const label = gpxStore.estimatedCorrection?.confidenceLabel;
  if (!label || label === "—" || label === "None") return null;

  const styles = {
    Good: "tw-bg-emerald-100 tw-text-emerald-800 tw-ring-emerald-200",
    Fair: "tw-bg-sky-100 tw-text-sky-800 tw-ring-sky-200",
    Low: "tw-bg-amber-100 tw-text-amber-900 tw-ring-amber-200",
  };

  return {
    label: `${label} confidence`,
    class:
      styles[label] ?? "tw-bg-slate-100 tw-text-slate-700 tw-ring-slate-200",
  };
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="correction-heading"
  >
    <div class="dashboard-card-header">
      <div>
        <h2
          id="correction-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Correction Controls
        </h2>
        <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
          Ship motion is estimated from trimmed edges. Adjust sliders to
          fine-tune.
        </p>
      </div>
      <span
        class="tw-inline-flex tw-shrink-0 tw-items-center tw-rounded-full tw-px-2.5 tw-py-1 tw-text-xs tw-font-semibold"
        :class="modeBadge.class"
      >
        {{ modeBadge.label }}
      </span>
    </div>

    <div class="dashboard-card-body">
      <div
        v-if="!gpxStore.isReady"
        class="tw-rounded-lg tw-bg-slate-50 tw-p-4 tw-text-sm tw-text-slate-500"
      >
        Upload a FIT or GPX file to analyze ship motion and preview correction.
      </div>

      <div
        v-else
        class="tw-space-y-6"
      >
        <div
          class="tw-overflow-hidden tw-rounded-xl tw-border tw-p-4"
          :class="statusPanel.container"
          role="status"
          aria-live="polite"
        >
          <div class="tw-flex tw-gap-3">
            <component
              :is="statusPanel.icon"
              class="tw-mt-0.5 tw-h-6 tw-w-6 tw-shrink-0"
              :class="statusPanel.iconClass"
              aria-hidden="true"
            />

            <div class="tw-min-w-0 tw-flex-1">
              <div
                class="tw-flex tw-flex-wrap tw-items-start tw-justify-between tw-gap-2"
              >
                <p class="tw-text-sm tw-font-semibold tw-text-slate-900">
                  {{ statusPanel.title }}
                </p>
                <span
                  v-if="confidenceBadge && statusPanel.showEstimate"
                  class="tw-inline-flex tw-shrink-0 tw-items-center tw-rounded-full tw-px-2 tw-py-0.5 tw-text-[11px] tw-font-semibold tw-ring-1 tw-ring-inset"
                  :class="confidenceBadge.class"
                >
                  {{ confidenceBadge.label }}
                </span>
              </div>

              <p
                v-if="statusPanel.showEstimate && gpxStore.estimatedCorrection"
                class="tw-mt-2 tw-font-mono tw-text-lg tw-font-semibold tw-tabular-nums tw-tracking-tight"
                :class="
                  correctionState === 'applied'
                    ? 'tw-text-emerald-900'
                    : 'tw-text-slate-900'
                "
              >
                {{ gpxStore.estimatedCorrection.shipSpeedKnots.toFixed(1) }} kn
                <span class="tw-font-sans tw-font-normal tw-text-slate-500">@</span>
                {{ gpxStore.estimatedCorrection.shipHeadingDeg }}°
              </p>

              <p
                class="tw-mt-1.5 tw-text-sm tw-leading-relaxed tw-text-slate-600"
              >
                {{ statusPanel.subtitle }}
              </p>
            </div>
          </div>

          <div
            v-if="gpxStore.hasEstimate"
            class="tw-mt-4 tw-grid tw-grid-cols-1 tw-gap-2 sm:tw-grid-cols-2"
          >
            <button
              type="button"
              class="btn-primary tw-w-full tw-py-2 tw-text-xs"
              :disabled="!gpxStore.canReapplyEstimate"
              @click="gpxStore.reapplyEstimate()"
            >
              <ArrowPathIcon
                class="tw-h-4 tw-w-4"
                aria-hidden="true"
              />
              Re-apply estimate
            </button>
            <button
              type="button"
              class="btn-secondary tw-w-full tw-py-2 tw-text-xs"
              :disabled="gpxStore.correction.shipSpeedKnots === 0"
              @click="gpxStore.resetCorrection()"
            >
              Reset to zero
            </button>
          </div>
        </div>

        <div
          class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-2"
        >
          <p class="tw-text-xs tw-text-slate-500">
            Preview updates instantly as you drag.
          </p>
          <button
            type="button"
            class="btn-secondary tw-py-1.5 tw-px-3 tw-text-xs"
            :aria-pressed="fineTune"
            @click="fineTune = !fineTune"
          >
            {{ fineTune ? "Standard mode" : "Fine-tune mode" }}
          </button>
        </div>

        <div class="tw-space-y-6">
          <div>
            <div
              class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"
            >
              <label
                for="ship-speed"
                class="form-label"
              >Ship speed (knots)</label>
              <div class="tw-flex tw-items-center tw-gap-2">
                <input
                  v-if="fineTune"
                  id="ship-speed-input"
                  type="number"
                  min="0"
                  max="25"
                  :step="steps.speed"
                  :value="speedSlider.local.value.toFixed(2)"
                  class="tw-w-20 tw-rounded-md tw-border tw-border-slate-300 tw-bg-white tw-px-2 tw-py-1 tw-text-right tw-text-sm tw-tabular-nums focus:tw-border-brand-500 focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-brand-500"
                  aria-label="Ship speed in knots"
                  @change="speedSlider.handleChange($event.target.value)"
                >
                <span
                  class="tw-text-sm tw-font-semibold tw-tabular-nums tw-text-slate-900"
                >
                  {{ speedSlider.local.value.toFixed(fineTune ? 2 : 1) }} kn
                </span>
              </div>
            </div>
            <input
              id="ship-speed"
              type="range"
              min="0"
              max="25"
              :step="steps.speed"
              :value="speedSlider.local.value"
              class="slider-control tw-mt-3 tw-w-full"
              @input="speedSlider.handleInput($event.target.value)"
              @change="speedSlider.handleChange($event.target.value)"
            >
            <p class="form-hint">
              Typical cruise transit speeds are 10–15 knots.
            </p>
          </div>

          <div>
            <div
              class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"
            >
              <label
                for="ship-heading"
                class="form-label"
              >Ship heading</label>
              <div class="tw-flex tw-items-center tw-gap-2">
                <input
                  v-if="fineTune"
                  id="ship-heading-input"
                  type="number"
                  min="0"
                  max="359"
                  :step="steps.heading"
                  :value="headingSlider.local.value.toFixed(1)"
                  class="tw-w-20 tw-rounded-md tw-border tw-border-slate-300 tw-bg-white tw-px-2 tw-py-1 tw-text-right tw-text-sm tw-tabular-nums focus:tw-border-brand-500 focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-brand-500"
                  aria-label="Ship heading in degrees"
                  @change="
                    headingSlider.handleChange(
                      clamp($event.target.value, 0, 359),
                    )
                  "
                >
                <span
                  class="tw-text-sm tw-font-semibold tw-tabular-nums tw-text-slate-900"
                >
                  {{ headingLabel }}
                </span>
              </div>
            </div>
            <input
              id="ship-heading"
              type="range"
              min="0"
              max="359"
              :step="steps.heading"
              :value="headingSlider.local.value"
              class="slider-control tw-mt-3 tw-w-full"
              @input="headingSlider.handleInput($event.target.value)"
              @change="headingSlider.handleChange($event.target.value)"
            >
            <p class="form-hint">
              0° = north, 90° = east, 180° = south, 270° = west.
            </p>
          </div>

          <div>
            <div
              class="tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"
            >
              <label
                for="correction-strength"
                class="form-label"
              >Correction strength</label>
              <div class="tw-flex tw-items-center tw-gap-2">
                <input
                  v-if="fineTune"
                  id="correction-strength-input"
                  type="number"
                  min="0"
                  max="150"
                  :step="steps.strength"
                  :value="strengthSlider.local.value.toFixed(1)"
                  class="tw-w-20 tw-rounded-md tw-border tw-border-slate-300 tw-bg-white tw-px-2 tw-py-1 tw-text-right tw-text-sm tw-tabular-nums focus:tw-border-brand-500 focus:tw-outline-none focus:tw-ring-1 focus:tw-ring-brand-500"
                  aria-label="Correction strength percent"
                  @change="
                    strengthSlider.handleChange(
                      clamp($event.target.value, 0, 150),
                    )
                  "
                >
                <span
                  class="tw-text-sm tw-font-semibold tw-tabular-nums tw-text-slate-900"
                >
                  {{ strengthSlider.local.value.toFixed(fineTune ? 1 : 0) }}%
                </span>
              </div>
            </div>
            <input
              id="correction-strength"
              type="range"
              min="0"
              max="150"
              :step="steps.strength"
              :value="strengthSlider.local.value"
              class="slider-control tw-mt-3 tw-w-full"
              @input="strengthSlider.handleInput($event.target.value)"
              @change="strengthSlider.handleChange($event.target.value)"
            >
            <p class="form-hint">
              100% subtracts the full estimated ship vector from the GPS track.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
