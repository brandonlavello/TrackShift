import { onScopeDispose, ref, watch } from 'vue';

export type SliderControlOptions = {
  /** Debounced store commits while dragging (ms). Final value always commits on release. */
  debounceMs?: number;
};

/**
 * Keeps a local slider value in sync with an external source while avoiding
 * expensive commits on every input event. Updates the source on a debounced
 * timer during drag and immediately on pointer release (change).
 */
export function useSliderControl(
  getSource: () => number,
  commit: (value: number) => void,
  options: SliderControlOptions = {},
) {
  const { debounceMs = 120 } = options;
  const local = ref(getSource());
  const dragging = ref(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  watch(getSource, (value) => {
    if (!dragging.value) {
      local.value = value;
    }
  });

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function scheduleCommit(value: number) {
    clearTimer();
    timer = setTimeout(() => commit(value), debounceMs);
  }

  function handleInput(raw: string | number) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    dragging.value = true;
    local.value = value;
    if (debounceMs <= 0) {
      commit(value);
      return;
    }
    scheduleCommit(value);
  }

  function handleChange(raw: string | number) {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    dragging.value = false;
    clearTimer();
    local.value = value;
    commit(value);
  }

  onScopeDispose(clearTimer);

  return { local, dragging, handleInput, handleChange };
}
