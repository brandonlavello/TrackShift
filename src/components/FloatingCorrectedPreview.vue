<script setup>
import TrackPreviewSvg from '@/components/TrackPreviewSvg.vue';

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  points: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="tw-transition tw-duration-200 tw-ease-out"
      enter-from-class="tw-opacity-0 tw-translate-y-2"
      enter-to-class="tw-opacity-100 tw-translate-y-0"
      leave-active-class="tw-transition tw-duration-150 tw-ease-in"
      leave-from-class="tw-opacity-100 tw-translate-y-0"
      leave-to-class="tw-opacity-0 tw-translate-y-2"
    >
      <div
        v-if="visible"
        class="tw-pointer-events-none tw-fixed tw-bottom-4 tw-right-4 tw-z-50 tw-w-[9.5rem] tw-overflow-hidden tw-rounded-xl tw-border tw-border-slate-200 tw-bg-white tw-shadow-lg tw-ring-1 tw-ring-black/5 sm:tw-w-[11rem]"
        role="status"
        aria-live="polite"
        aria-label="Corrected track preview while adjusting"
      >
        <div
          class="tw-border-b tw-border-slate-100 tw-bg-brand-50 tw-px-2.5 tw-py-1.5"
        >
          <p class="tw-text-[10px] tw-font-semibold tw-uppercase tw-tracking-wide tw-text-brand-700">
            Corrected
          </p>
        </div>
        <div class="tw-aspect-[10/7] tw-bg-slate-100">
          <TrackPreviewSvg
            :points="points"
            variant="corrected"
            :show-legend="false"
            grid-id="floating-corrected-grid"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
