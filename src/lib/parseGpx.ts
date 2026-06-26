import { buildActivityTrack } from './trackNormalize';
import type { TrackPoint } from './trackTypes';

function parseGpxTime(value: string | null): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseTrkpts(xml: Document): TrackPoint[] {
  const points: TrackPoint[] = [];
  const trkpts = xml.querySelectorAll('trkpt');

  trkpts.forEach((trkpt) => {
    const lat = Number(trkpt.getAttribute('lat'));
    const lon = Number(trkpt.getAttribute('lon'));
    const time = parseGpxTime(trkpt.querySelector('time')?.textContent ?? null);
    if (!time || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const eleText = trkpt.querySelector('ele')?.textContent;
    const elevation = eleText != null && eleText !== '' ? Number(eleText) : undefined;

    points.push({
      time,
      lat,
      lon,
      elevation: Number.isFinite(elevation) ? elevation : undefined,
      source: 'gpx',
      raw: {
        lat,
        lon,
        elevation,
        time: time.toISOString(),
      },
    });
  });

  return points;
}

export async function parseGpx(text: string, fileName: string) {
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  const parseError = xml.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX file.');
  }

  const points = parseTrkpts(xml);
  if (!points.length) {
    throw new Error('No track points found in GPX file.');
  }

  return buildActivityTrack('gpx', fileName, points);
}
