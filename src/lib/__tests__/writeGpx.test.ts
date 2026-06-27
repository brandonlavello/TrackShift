import { describe, expect, it } from 'vitest';

import { correctTrack } from '../correction';
import { parseGpx } from '../parseGpx';
import { writeGpx } from '../writeGpx';
import { makeShipDriftPoints } from './fixtures';

describe('writeGpx', () => {
  it('writes valid GPX with escaped metadata and track points', () => {
    const points = makeShipDriftPoints({
      count: 3,
      speedKnots: 10,
      headingDeg: 0,
    });

    const gpx = writeGpx(points, { name: 'Deck run & "corrected"' });

    expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(gpx).toContain('<name>Deck run &amp; &quot;corrected&quot;</name>');
    expect(gpx.match(/<trkpt /g)).toHaveLength(3);
    expect(gpx).toContain('<time>2024-06-01T12:00:00.000Z</time>');
  });

  it('round-trips corrected points through parse → correct → write → parse', async () => {
    const raw = makeShipDriftPoints({
      count: 20,
      speedKnots: 10,
      headingDeg: 90,
    });

    const corrected = correctTrack(raw, {
      shipSpeedKnots: 10,
      shipHeadingDeg: 90,
      strengthPercent: 100,
      mode: 'estimated',
    });

    const gpxText = writeGpx(corrected, { name: 'Corrected run' });
    const reparsed = await parseGpx(gpxText, 'round-trip.gpx');

    expect(reparsed.points).toHaveLength(corrected.length);
    expect(reparsed.points[0].lat).toBeCloseTo(corrected[0].lat!, 5);
    expect(reparsed.points[0].lon).toBeCloseTo(corrected[0].lon!, 5);
    expect(reparsed.points.at(-1)?.lat).toBeCloseTo(corrected.at(-1)!.lat!, 5);
    expect(reparsed.points.at(-1)?.lon).toBeCloseTo(corrected.at(-1)!.lon!, 5);
  });
});
