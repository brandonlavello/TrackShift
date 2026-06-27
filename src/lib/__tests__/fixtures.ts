import type { TrackPoint } from '../trackTypes';

const KNOTS_TO_MPS = 0.514444;
const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

/** GPS positions that include only constant ship drift (no runner motion). */
export function makeShipDriftPoints({
  count,
  intervalSec = 1,
  speedKnots,
  headingDeg,
  originLat = 25,
  originLon = -80,
  startTime = new Date('2024-06-01T12:00:00Z'),
}: {
  count: number;
  intervalSec?: number;
  speedKnots: number;
  headingDeg: number;
  originLat?: number;
  originLon?: number;
  startTime?: Date;
}): TrackPoint[] {
  const headingRad = (headingDeg * Math.PI) / 180;
  const speedMps = speedKnots * KNOTS_TO_MPS;
  const northMps = speedMps * Math.cos(headingRad);
  const eastMps = speedMps * Math.sin(headingRad);
  const mplng = metersPerDegLng(originLat);

  return Array.from({ length: count }, (_, index) => {
    const elapsedSec = index * intervalSec;
    return {
      time: new Date(startTime.getTime() + elapsedSec * 1000),
      lat: originLat + (northMps * elapsedSec) / METERS_PER_DEG_LAT,
      lon: originLon + (eastMps * elapsedSec) / mplng,
      source: 'gpx' as const,
    };
  });
}

/** FIT-like activity: standing lead-in, running window, standing trail-out. */
export function makeFitRunActivity({
  leadInCount = 30,
  runCount = 35,
  trailOutCount = 30,
  intervalSec = 1,
  standingSpeedMps = 0.2,
  runningSpeedMps = 3,
  speedKnots = 12,
  headingDeg = 90,
  originLat = 25,
  originLon = -80,
  startTime = new Date('2024-06-01T12:00:00Z'),
}: {
  leadInCount?: number;
  runCount?: number;
  trailOutCount?: number;
  intervalSec?: number;
  standingSpeedMps?: number;
  runningSpeedMps?: number;
  speedKnots?: number;
  headingDeg?: number;
  originLat?: number;
  originLon?: number;
  startTime?: Date;
}): TrackPoint[] {
  const totalCount = leadInCount + runCount + trailOutCount;
  const drift = makeShipDriftPoints({
    count: totalCount,
    intervalSec,
    speedKnots,
    headingDeg,
    originLat,
    originLon,
    startTime,
  });

  return drift.map((point, index) => {
    const inRun =
      index >= leadInCount && index < leadInCount + runCount;
    return {
      ...point,
      speedMps: inRun ? runningSpeedMps : standingSpeedMps,
      source: 'fit' as const,
    };
  });
}

export const SAMPLE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackShift-test">
  <trk>
    <trkseg>
      <trkpt lat="25.00000" lon="-80.00000">
        <ele>10.5</ele>
        <time>2024-06-01T12:00:00Z</time>
      </trkpt>
      <trkpt lat="25.00010" lon="-80.00005">
        <time>2024-06-01T12:00:01Z</time>
      </trkpt>
      <trkpt lat="25.00020" lon="-80.00010">
        <ele>11</ele>
        <time>2024-06-01T12:00:02Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;
