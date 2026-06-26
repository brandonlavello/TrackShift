<script setup>
import { ref } from 'vue';
import {
  ArrowUpTrayIcon,
  BeakerIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline';

import { useGpxStore } from '@/stores/gpxStore';

const gpxStore = useGpxStore();
const isDragging = ref(false);

const acceptTypes = '.fit,.gpx,application/gpx+xml,application/octet-stream';

async function handleFile(file) {
  if (!file) return;
  try {
    await gpxStore.loadFile(file);
  } catch {
    // loadError is set in the store.
  }
}

function handleClear() {
  gpxStore.clearSession();
}

function loadDemo() {
  gpxStore.loadDemoSession();
}

function onDragOver(event) {
  event.preventDefault();
  isDragging.value = true;
}

function onDragLeave() {
  isDragging.value = false;
}

function onDrop(event) {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  handleFile(file);
}

function onFileChange(event) {
  const file = event.target.files?.[0];
  handleFile(file);
  event.target.value = '';
}
</script>

<template>
  <section
    class="dashboard-card"
    aria-labelledby="upload-heading"
  >
    <div class="dashboard-card-header">
      <div>
        <h2
          id="upload-heading"
          class="tw-text-base tw-font-semibold tw-text-slate-900"
        >
          Upload Activity
        </h2>
        <p class="tw-mt-0.5 tw-text-sm tw-text-slate-500">
          Garmin FIT preferred. GPX supported as fallback.
        </p>
      </div>
      <div class="tw-flex tw-gap-2">
        <button
          v-if="!gpxStore.hasFile"
          type="button"
          class="btn-secondary tw-shrink-0"
          @click="loadDemo"
        >
          <BeakerIcon
            class="tw-h-4 tw-w-4"
            aria-hidden="true"
          />
          Try demo
        </button>
        <button
          v-if="gpxStore.hasFile"
          type="button"
          class="btn-secondary tw-shrink-0"
          @click="handleClear"
        >
          <TrashIcon
            class="tw-h-4 tw-w-4"
            aria-hidden="true"
          />
          Clear
        </button>
      </div>
    </div>

    <div class="dashboard-card-body">
      <div
        v-if="!gpxStore.hasFile"
        class="tw-relative tw-rounded-xl tw-border-2 tw-border-dashed tw-p-8 tw-text-center tw-transition"
        :class="
          isDragging
            ? 'tw-border-brand-500 tw-bg-brand-50'
            : 'tw-border-slate-300 tw-bg-slate-50 hover:tw-border-brand-400'
        "
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <ArrowUpTrayIcon
          class="tw-mx-auto tw-h-10 tw-w-10 tw-text-slate-400"
          aria-hidden="true"
        />
        <p class="tw-mt-3 tw-text-sm tw-font-medium tw-text-slate-900">
          Drag and drop a FIT or GPX file
        </p>
        <p class="tw-mt-1 tw-text-sm tw-text-slate-500">
          or choose a file from your computer
        </p>

        <label class="tw-mt-5 tw-inline-block">
          <span class="btn-primary tw-cursor-pointer">
            <DocumentTextIcon
              class="tw-h-4 tw-w-4"
              aria-hidden="true"
            />
            Choose file
          </span>
          <input
            type="file"
            :accept="acceptTypes"
            class="tw-sr-only"
            @change="onFileChange"
          >
        </label>

        <p
          v-if="gpxStore.isLoading"
          class="tw-mt-4 tw-text-sm tw-text-brand-700"
        >
          Parsing file…
        </p>
        <p
          v-else-if="gpxStore.loadError"
          class="tw-mt-4 tw-text-sm tw-text-red-600"
          role="alert"
        >
          {{ gpxStore.loadError }}
        </p>
      </div>

      <div
        v-else
        class="tw-flex tw-flex-col tw-gap-4 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between tw-rounded-xl tw-border tw-border-emerald-200 tw-bg-emerald-50 tw-p-4"
      >
        <div class="tw-flex tw-items-start tw-gap-3">
          <div
            class="tw-flex tw-h-10 tw-w-10 tw-shrink-0 tw-items-center tw-justify-center tw-rounded-lg tw-bg-white tw-text-emerald-600 tw-ring-1 tw-ring-emerald-200"
          >
            <DocumentTextIcon
              class="tw-h-5 tw-w-5"
              aria-hidden="true"
            />
          </div>
          <div>
            <p class="tw-font-semibold tw-text-slate-900">
              {{ gpxStore.fileName }}
            </p>
            <p class="tw-mt-0.5 tw-text-sm tw-text-slate-600">
              {{ gpxStore.activityTrack?.source?.toUpperCase() }} ·
              {{ gpxStore.allPoints.length.toLocaleString() }} records ·
              {{ gpxStore.mapPoints.length.toLocaleString() }} GPS points
            </p>
            <p
              v-if="gpxStore.uploadedAt"
              class="tw-mt-0.5 tw-text-xs tw-text-slate-500"
            >
              Loaded {{ gpxStore.uploadedAt.toLocaleString() }}
            </p>
          </div>
        </div>

        <label class="tw-shrink-0">
          <span class="btn-secondary tw-cursor-pointer">Replace file</span>
          <input
            type="file"
            :accept="acceptTypes"
            class="tw-sr-only"
            @change="onFileChange"
          >
        </label>
      </div>
    </div>
  </section>
</template>
