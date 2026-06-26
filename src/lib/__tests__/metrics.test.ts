import { describe, expect, it } from 'vitest';

import { estimateShipMotionFromTrimEdges } from '../metrics';
import { makeShipDriftPoints } from './fixtures';

describe('estimateShipMotionFromTrimEdges', () => {
  it('estimates speed and heading from matching lead-in and trail-out drift', () => {
    const allPoints = makeShipDriftPoints({
      count: 82,
      intervalSec: 1,
      speedKnots: 12,
      headingDeg: 90,
    });

    const runStart = 31;
    const runEnd = 50;
    const estimate = estimateShipMotionFromTrimEdges(allPoints, runStart, runEnd);

    expect(estimate).not.toBeNull();
    expect(estimate!.confidenceLabel).not.toBe('None');
    expect(estimate!.shipSpeedKnots).toBeCloseTo(12, 0);
    expect(estimate!.shipHeadingDeg).toBeCloseTo(90, 0);
    expect(estimate!.strengthPercent).toBe(100);
  });

  it('returns a none estimate when trim edges are too short', () => {
    const allPoints = makeShipDriftPoints({
      count: 25,
      intervalSec: 1,
      speedKnots: 12,
      headingDeg: 90,
    });

    const estimate = estimateShipMotionFromTrimEdges(allPoints, 5, 19);

    expect(estimate).not.toBeNull();
    expect(estimate!.confidenceLabel).toBe('None');
    expect(estimate!.shipSpeedKnots).toBe(0);
  });
});
