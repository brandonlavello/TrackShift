import { displacementMeters, shipVelocityMps } from './geo';
import { hasUsablePosition } from './trackNormalize';
import type { CorrectionSettings, TrackPoint } from './trackTypes';

const METERS_PER_DEG_LAT = 111_320;

function metersPerDegLng(lat: number) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function metersToLatLng(
  originLat: number,
  originLng: number,
  northM: number,
  eastM: number,
) {
  return {
    lat: originLat + northM / METERS_PER_DEG_LAT,
    lon: originLng + eastM / metersPerDegLng(originLat),
  };
}

export function isCorrectionDisabled(settings: CorrectionSettings): boolean {
  return settings.strengthPercent === 0 || settings.shipSpeedKnots === 0;
}

/**
 * Subtract estimated ship motion from GPS track points.
 */
export function correctTrack(
  points: TrackPoint[],
  settings: CorrectionSettings,
  referenceIndex = 0,
): TrackPoint[] {
  if (!points.length || isCorrectionDisabled(settings)) {
    return points.map((point) => ({ ...point }));
  }

  const strength = settings.strengthPercent / 100;
  const shipVelocity = shipVelocityMps(settings.shipSpeedKnots, settings.shipHeadingDeg);
  const refPoint = points[referenceIndex] ?? points[0];

  if (!hasUsablePosition(refPoint)) {
    return points.map((point) => ({ ...point }));
  }

  return points.map((point) => {
    if (!hasUsablePosition(point)) return { ...point };

    const elapsedFromRef = (point.time.getTime() - refPoint.time.getTime()) / 1000;
    const shipDisp = displacementMeters(shipVelocity, elapsedFromRef);

    const rawFromRefNorth = (point.lat - refPoint.lat) * METERS_PER_DEG_LAT;
    const rawFromRefEast = (point.lon - refPoint.lon) * metersPerDegLng(refPoint.lat);

    const correctedNorth = rawFromRefNorth - shipDisp.north * strength;
    const correctedEast = rawFromRefEast - shipDisp.east * strength;

    const { lat, lon } = metersToLatLng(
      refPoint.lat,
      refPoint.lon,
      correctedNorth,
      correctedEast,
    );

    return {
      ...point,
      lat,
      lon,
    };
  });
}
