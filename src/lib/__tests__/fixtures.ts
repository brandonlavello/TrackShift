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
