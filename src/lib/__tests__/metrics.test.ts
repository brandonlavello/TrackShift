import { describe, expect, it } from 'vitest';

import { detectRunSegmentAuto, estimateShipMotionFromTrimEdges } from '../metrics';
import { makeFitRunActivity, makeShipDriftPoints } from './fixtures';

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

describe('detectRunSegmentAuto', () => {
  it('detects and trims a FIT run window from standing-still edges', () => {
    const points = makeFitRunActivity({
      leadInCount: 30,
      runCount: 35,
      trailOutCount: 30,
    });

    const segment = detectRunSegmentAuto(points);

    expect(segment).not.toBeNull();
    expect(segment!.label).toBe('Auto-detected run');
    expect(segment!.start).toBe(30);
    expect(segment!.end).toBe(64);
  });
});
