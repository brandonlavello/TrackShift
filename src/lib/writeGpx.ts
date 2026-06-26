import type { TrackPoint } from './trackTypes';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatIsoTime(date: Date): string {
  return date.toISOString();
}

export function writeGpx(points: TrackPoint[], options: { name?: string } = {}): string {
  const name = escapeXml(options.name ?? 'Corrected Activity');
  const trackPoints = points
    .filter((p) => p.lat != null && p.lon != null)
    .map((point) => {
      const ele =
        point.elevation != null
          ? `        <ele>${point.elevation}</ele>\n`
          : '';
      return `      <trkpt lat="${point.lat}" lon="${point.lon}">\n${ele}        <time>${formatIsoTime(point.time)}</time>\n      </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TrackShift"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <time>${formatIsoTime(points[0]?.time ?? new Date())}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>
`;
}

export function downloadGpx(gpxText: string, fileName: string) {
  const blob = new Blob([gpxText], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.gpx') ? fileName : `${fileName.replace(/\.[^.]+$/, '')}-corrected.gpx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
