import { describe, expect, it } from 'vitest';

import { correctTrack, isCorrectionDisabled } from '../correction';
import { makeShipDriftPoints } from './fixtures';

describe('correctTrack', () => {
  it('removes pure ship drift when correction matches the recorded motion', () => {
    const points = makeShipDriftPoints({
      count: 45,
      speedKnots: 10,
      headingDeg: 0,
    });

    const corrected = correctTrack(points, {
      shipSpeedKnots: 10,
      shipHeadingDeg: 0,
      strengthPercent: 100,
      mode: 'estimated',
    });

    const ref = corrected[0];
    for (const point of corrected) {
      expect(point.lat).toBeCloseTo(ref.lat!, 5);
      expect(point.lon).toBeCloseTo(ref.lon!, 5);
    }
  });

  it('leaves points unchanged when correction is disabled', () => {
    const points = makeShipDriftPoints({
      count: 10,
      speedKnots: 12,
      headingDeg: 90,
    });

    const corrected = correctTrack(points, {
      shipSpeedKnots: 12,
      shipHeadingDeg: 90,
      strengthPercent: 0,
      mode: 'off',
    });

    expect(corrected.map((p) => p.lat)).toEqual(points.map((p) => p.lat));
    expect(corrected.map((p) => p.lon)).toEqual(points.map((p) => p.lon));
  });

  it('applies partial correction at reduced strength', () => {
    const points = makeShipDriftPoints({
      count: 30,
      speedKnots: 8,
      headingDeg: 90,
    });
    const last = points.at(-1)!;

    const halfStrength = correctTrack(points, {
      shipSpeedKnots: 8,
      shipHeadingDeg: 90,
      strengthPercent: 50,
      mode: 'manual',
    });
    const fullStrength = correctTrack(points, {
      shipSpeedKnots: 8,
      shipHeadingDeg: 90,
      strengthPercent: 100,
      mode: 'manual',
    });

    const ref = points[0];
    const rawLonDelta = last.lon! - ref.lon!;
    const halfLonDelta = halfStrength.at(-1)!.lon! - ref.lon!;
    const fullLonDelta = fullStrength.at(-1)!.lon! - ref.lon!;

    expect(Math.abs(halfLonDelta)).toBeGreaterThan(Math.abs(fullLonDelta));
    expect(Math.abs(fullLonDelta)).toBeLessThan(Math.abs(rawLonDelta) * 0.15);
  });
});

describe('isCorrectionDisabled', () => {
  it('is true when strength or speed is zero', () => {
    expect(
      isCorrectionDisabled({
        shipSpeedKnots: 0,
        shipHeadingDeg: 90,
        strengthPercent: 100,
        mode: 'off',
      }),
    ).toBe(true);
    expect(
      isCorrectionDisabled({
        shipSpeedKnots: 10,
        shipHeadingDeg: 90,
        strengthPercent: 0,
        mode: 'off',
      }),
    ).toBe(true);
  });
});
