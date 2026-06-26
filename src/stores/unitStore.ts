import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

import type { DistanceUnit } from '@/lib/format';

const STORAGE_KEY = 'trackshift-distance-unit';

function readStoredUnit(): DistanceUnit {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'km' || stored === 'mi') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'mi';
}

export const useUnitStore = defineStore('units', () => {
  const distanceUnit = ref<DistanceUnit>(readStoredUnit());

  function setDistanceUnit(unit: DistanceUnit) {
    distanceUnit.value = unit;
  }

  function toggleDistanceUnit() {
    distanceUnit.value = distanceUnit.value === 'km' ? 'mi' : 'km';
  }

  watch(distanceUnit, (unit) => {
    try {
      localStorage.setItem(STORAGE_KEY, unit);
    } catch {
      // ignore
    }
  });

  return {
    distanceUnit,
    setDistanceUnit,
    toggleDistanceUnit,
  };
});
