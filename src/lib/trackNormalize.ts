import type { ActivityTrack, TrackPoint, TrackSource } from './trackTypes';

const FIELD_ALIASES: Record<string, string[]> = {
  lat: ['lat', 'latitude', 'position_lat', 'positionLat'],
  lon: ['lon', 'longitude', 'position_long', 'positionLong', 'position_lon', 'positionLon'],
  elevation: ['elevation', 'altitude', 'enhanced_altitude', 'enhancedAltitude'],
  speedMps: ['speedMps', 'speed', 'enhanced_speed', 'enhancedSpeed'],
  distanceMeters: ['distanceMeters', 'distance'],
  cadence: ['cadence'],
  heartRate: ['heart_rate', 'heartRate'],
  time: ['time', 'timestamp'],
};

export function pickField(record: Record<string, unknown>, canonical: keyof typeof FIELD_ALIASES) {
  for (const key of FIELD_ALIASES[canonical]) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

const SEMICIRCLE_SCALE = 180 / 2 ** 31;

export function semicirclesToDegrees(value: number): number {
  return value * SEMICIRCLE_SCALE;
}

/** FIT/Garmin values may already be degrees or semicircles. */
export function normalizeCoordinate(value: unknown, isLatitude: boolean): number | undefined {
  if (value == null || value === '') return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return undefined;

  const max = isLatitude ? 90 : 180;
  if (Math.abs(num) <= max) return num;
  if (Math.abs(num) < 2 ** 31) return semicirclesToDegrees(num);
  return undefined;
}

export function normalizeSpeedToMps(value: unknown): number | undefined {
  if (value == null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return undefined;
  // Heuristic: values > 35 are likely km/h (Garmin with unit conversion off).
  if (num > 35) return num / 3.6;
  // Values > 12 likely m/s already or km/h for very fast — treat <= 12 as m/s.
  if (num <= 12) return num;
  return num / 3.6;
}

export function parseTimestamp(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

export function hasUsablePosition(point: TrackPoint): point is TrackPoint & { lat: number; lon: number } {
  return (
    point.lat != null &&
    point.lon != null &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lon) &&
    !(point.lat === 0 && point.lon === 0)
  );
}

export function collectAvailableFields(points: TrackPoint[]): string[] {
  const fields = new Set<string>(['time', 'lat', 'lon', 'source']);
  for (const point of points) {
    if (point.elevation != null) fields.add('elevation');
    if (point.speedMps != null) fields.add('speedMps');
    if (point.distanceMeters != null) fields.add('distanceMeters');
    if (point.cadence != null) fields.add('cadence');
    if (point.heartRate != null) fields.add('heartRate');
    if (point.raw) {
      Object.keys(point.raw).forEach((key) => fields.add(key));
    }
  }
  return [...fields].sort();
}

export function buildActivityTrack(
  source: TrackSource,
  fileName: string,
  points: TrackPoint[],
  deviceDistanceMeters?: number,
): ActivityTrack {
  const sorted = [...points].sort((a, b) => a.time.getTime() - b.time.getTime());

  return {
    source,
    fileName,
    points: sorted,
    availableFields: collectAvailableFields(sorted),
    startTime: sorted[0]?.time,
    endTime: sorted.at(-1)?.time,
    deviceDistanceMeters: deviceDistanceMeters ?? inferDeviceDistance(sorted),
  };
}

function inferDeviceDistance(points: TrackPoint[]): number | undefined {
  const withDistance = points.filter((p) => p.distanceMeters != null);
  if (!withDistance.length) return undefined;
  return withDistance.at(-1)?.distanceMeters;
}

export function toMapPoints(points: TrackPoint[]): { lat: number; lon: number; time: Date; elevation?: number }[] {
  return points.filter(hasUsablePosition).map((p) => ({
    lat: p.lat,
    lon: p.lon,
    time: p.time,
    elevation: p.elevation,
  }));
}
