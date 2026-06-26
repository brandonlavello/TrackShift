import FitParser from 'fit-file-parser';

import {
  buildActivityTrack,
  hasUsablePosition,
  normalizeCoordinate,
  normalizeSpeedToMps,
  parseTimestamp,
  pickField,
} from './trackNormalize';
import type { FitParseDebug, TrackPoint } from './trackTypes';

type FitRecord = Record<string, unknown>;

export type FitParseResult = {
  activity: ReturnType<typeof buildActivityTrack>;
  debug: FitParseDebug;
};

function recordToTrackPoint(record: FitRecord): TrackPoint | null {
  const time = parseTimestamp(pickField(record, 'time'));
  if (!time) return null;

  const lat = normalizeCoordinate(pickField(record, 'lat'), true);
  const lon = normalizeCoordinate(pickField(record, 'lon'), false);
  const elevationRaw = pickField(record, 'elevation');
  const elevation =
    elevationRaw != null && Number.isFinite(Number(elevationRaw))
      ? Number(elevationRaw)
      : undefined;

  const speedRaw = pickField(record, 'speedMps');
  const speedMps = normalizeSpeedToMps(speedRaw);

  const distanceRaw = pickField(record, 'distanceMeters');
  const distanceMeters =
    distanceRaw != null && Number.isFinite(Number(distanceRaw))
      ? Number(distanceRaw)
      : undefined;

  const cadenceRaw = pickField(record, 'cadence');
  const cadence =
    cadenceRaw != null && Number.isFinite(Number(cadenceRaw))
      ? Number(cadenceRaw)
      : undefined;

  const heartRateRaw = pickField(record, 'heartRate');
  const heartRate =
    heartRateRaw != null && Number.isFinite(Number(heartRateRaw))
      ? Number(heartRateRaw)
      : undefined;

  return {
    time,
    lat,
    lon,
    elevation,
    speedMps,
    distanceMeters,
    cadence,
    heartRate,
    source: 'fit',
    raw: record,
  };
}

function extractRecords(parsed: Record<string, unknown>): FitRecord[] {
  const records = parsed.records;
  if (Array.isArray(records)) return records as FitRecord[];

  // Cascade mode nests records under laps/sessions.
  const sessions = parsed.sessions;
  if (Array.isArray(sessions)) {
    const nested: FitRecord[] = [];
    for (const session of sessions) {
      if (session && typeof session === 'object' && Array.isArray((session as FitRecord).records)) {
        nested.push(...((session as FitRecord).records as FitRecord[]));
      }
    }
    if (nested.length) return nested;
  }

  const laps = parsed.laps;
  if (Array.isArray(laps)) {
    const nested: FitRecord[] = [];
    for (const lap of laps) {
      if (lap && typeof lap === 'object' && Array.isArray((lap as FitRecord).records)) {
        nested.push(...((lap as FitRecord).records as FitRecord[]));
      }
    }
    if (nested.length) return nested;
  }

  return [];
}

function collectFieldNames(records: FitRecord[]): string[] {
  const names = new Set<string>();
  for (const record of records) {
    Object.keys(record).forEach((key) => names.add(key));
  }
  return [...names].sort();
}

function inferSessionDistance(parsed: Record<string, unknown>): number | undefined {
  const sessions = parsed.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return undefined;
  const session = sessions[0] as FitRecord;
  const totalDistance = session.total_distance ?? session.totalDistance;
  if (totalDistance != null && Number.isFinite(Number(totalDistance))) {
    return Number(totalDistance);
  }
  return undefined;
}

export async function parseFit(
  buffer: ArrayBuffer,
  fileName: string,
): Promise<FitParseResult> {
  const parser = new FitParser({
    force: true,
    mode: 'list',
    speedUnit: 'm/s',
    lengthUnit: 'm',
    elapsedRecordField: true,
  });

  const parsed = (await parser.parseAsync(buffer)) as Record<string, unknown>;
  const rawRecords = extractRecords(parsed);
  const points = rawRecords
    .map(recordToTrackPoint)
    .filter((point): point is TrackPoint => point != null);

  const usableGps = points.filter(hasUsablePosition);
  const activity = buildActivityTrack(
    'fit',
    fileName,
    points,
    inferSessionDistance(parsed),
  );

  const debug: FitParseDebug = {
    fileType: 'fit',
    rawRecordCount: rawRecords.length,
    usableGpsCount: usableGps.length,
    availableFields: collectFieldNames(rawRecords),
    firstUsablePoint: usableGps[0],
    lastUsablePoint: usableGps.at(-1),
    sampleRawRecord: rawRecords[0],
  };

  return { activity, debug };
}
