import { effectScope } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { useSliderControl } from '../useSliderControl';

describe('useSliderControl', () => {
  it('commits immediately on input when debounceMs is 0', () => {
    const source = 5;
    const commits: number[] = [];

    const scope = effectScope();
    scope.run(() => {
      const slider = useSliderControl(
        () => source,
        (value) => commits.push(value),
        { debounceMs: 0 },
      );

      slider.handleInput(7);

      expect(commits).toEqual([7]);
      expect(slider.local.value).toBe(7);
    });
    scope.stop();
  });

  it('debounces commits while dragging when debounceMs is set', () => {
    vi.useFakeTimers();

    const source = 0;
    const commits: number[] = [];

    const scope = effectScope();
    scope.run(() => {
      const slider = useSliderControl(
        () => source,
        (value) => commits.push(value),
        { debounceMs: 120 },
      );

      slider.handleInput(1);
      slider.handleInput(2);
      expect(commits).toEqual([]);

      vi.advanceTimersByTime(120);
      expect(commits).toEqual([2]);
    });
    scope.stop();

    vi.useRealTimers();
  });

  it('commits immediately on change and clears pending debounce', () => {
    vi.useFakeTimers();

    const commits: number[] = [];

    const scope = effectScope();
    scope.run(() => {
      const slider = useSliderControl(
        () => 0,
        (value) => commits.push(value),
        { debounceMs: 120 },
      );

      slider.handleInput(4);
      slider.handleChange(5);

      vi.advanceTimersByTime(120);
      expect(commits).toEqual([5]);
    });
    scope.stop();

    vi.useRealTimers();
  });
});
