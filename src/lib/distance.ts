import { haversineMeters } from './geo';
import { hasUsablePosition } from './trackNormalize';
import type { TrackPoint } from './trackTypes';

export function pathDistanceMeters(points: TrackPoint[]): number {
  const gps = points.filter(hasUsablePosition);
  if (gps.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < gps.length; i += 1) {
    total += haversineMeters(
      { lat: gps[i - 1].lat, lng: gps[i - 1].lon },
      { lat: gps[i].lat, lng: gps[i].lon },
    );
  }
  return total;
}

export function elapsedSeconds(points: TrackPoint[]): number {
  if (points.length < 2) return 0;
  return Math.max(0, (points.at(-1)!.time.getTime() - points[0].time.getTime()) / 1000);
}

export function averageSpeedKph(distanceMeters: number, seconds: number): number {
  if (!seconds) return 0;
  return (distanceMeters / seconds) * 3.6;
}

export function paceSecondsPerKm(distanceMeters: number, seconds: number): number | undefined {
  if (!distanceMeters) return undefined;
  return seconds / (distanceMeters / 1000);
}

export function computeGpsSpeedMps(points: TrackPoint[]): (number | undefined)[] {
  const speeds: (number | undefined)[] = new Array(points.length);
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!hasUsablePosition(prev) || !hasUsablePosition(curr)) {
      speeds[i] = undefined;
      continue;
    }
    const dt = (curr.time.getTime() - prev.time.getTime()) / 1000;
    if (dt <= 0) {
      speeds[i] = undefined;
      continue;
    }
    const dist = haversineMeters(
      { lat: prev.lat, lng: prev.lon },
      { lat: curr.lat, lng: curr.lon },
    );
    speeds[i] = dist / dt;
  }
  speeds[0] = speeds[1];
  return speeds;
}

export function segmentDeviceDistance(points: TrackPoint[]): number | undefined {
  const withDistance = points.filter((p) => p.distanceMeters != null);
  if (withDistance.length < 2) {
    return withDistance.at(-1)?.distanceMeters;
  }
  const start = withDistance[0].distanceMeters ?? 0;
  const end = withDistance.at(-1)!.distanceMeters ?? start;
  return Math.max(0, end - start);
}
