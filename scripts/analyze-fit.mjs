import fs from 'fs';
import { createRequire } from 'module';

// Use vite's prebundled deps via dynamic import from built chunks - simpler to inline fit parser
import FitParser from 'fit-file-parser';

const require = createRequire(import.meta.url);

async function parseFitSimple(buffer) {
  const parser = new FitParser({
    force: true,
    mode: 'list',
    speedUnit: 'm/s',
    lengthUnit: 'm',
    elapsedRecordField: true,
  });
  const parsed = await parser.parseAsync(buffer);
  const records = parsed.records ?? [];
  return records
    .map((r) => {
      const time = r.timestamp ? new Date(r.timestamp) : null;
      if (!time) return null;
      return {
        time,
        lat: r.position_lat ?? r.lat,
        lon: r.position_long ?? r.lon,
        speedMps: r.speed ?? r.enhanced_speed,
      };
    })
    .filter(Boolean);
}

// Copy core metrics logic for debug output
const KNOTS_TO_MPS = 0.514444;
const MIN_SAMPLE_SEC = 20;
const LOW_ACTIVITY_SPEED_MPS = 1.4;
const METERS_PER_DEG_LAT = 111_320;

function displacementVectorMeters(first, last) {
  const north = (last.lat - first.lat) * METERS_PER_DEG_LAT;
  const east = (last.lon - first.lon) * METERS_PER_DEG_LAT * Math.cos((first.lat * Math.PI) / 180);
  return { north, east };
}

function segmentResidualMeters(points) {
  if (points.length < 2) return 0;
  const first = points[0];
  const last = points.at(-1);
  const vector = displacementVectorMeters(first, last);
  const displacement = Math.hypot(vector.north, vector.east);
  if (displacement < 1) return 0;
  const unitNorth = vector.north / displacement;
  const unitEast = vector.east / displacement;
  let sumSq = 0;
  for (const point of points) {
    const north = (point.lat - first.lat) * METERS_PER_DEG_LAT;
    const east = (point.lon - first.lon) * METERS_PER_DEG_LAT * Math.cos((first.lat * Math.PI) / 180);
    const residual = Math.abs(north * -unitEast + east * unitNorth);
    sumSq += residual * residual;
  }
  return Math.sqrt(sumSq / points.length);
}

function analyzeSegment(name, points) {
  if (points.length < 2) {
    console.log(name, 'too short');
    return;
  }
  const dur = (points.at(-1).time - points[0].time) / 1000;
  const vec = displacementVectorMeters(points[0], points.at(-1));
  const disp = Math.hypot(vec.north, vec.east);
  const residual = segmentResidualMeters(points);
  const ratio = residual / Math.max(disp, 1);
  const kn = disp / dur / KNOTS_TO_MPS;
  const heading = (Math.atan2(vec.east, vec.north) * 180) / Math.PI;
  console.log(
    `${name}: pts=${points.length} dur=${dur.toFixed(0)}s disp=${disp.toFixed(1)}m residual=${residual.toFixed(1)}m ratio=${ratio.toFixed(3)} est=${kn.toFixed(1)}kn @ ${heading.toFixed(0)}°`,
  );
}

const fitPath = process.argv[2] ?? '/Users/brandon/Downloads/22601588442_ACTIVITY.fit';
const buf = fs.readFileSync(fitPath);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const pts = await parseFitSimple(ab);

console.log('=== REAL LOOP FIT ===', fitPath);
console.log('total points', pts.length);

// leading trim candidates
let leadEnd = 0;
for (let i = 0; i < pts.length; i += 1) {
  if ((pts[i].speedMps ?? 0) < 0.8) leadEnd = i;
  else break;
}
analyzeSegment('lead-in standing', pts.slice(0, leadEnd + 1).filter((p) => p.lat));
analyzeSegment('full activity', pts.filter((p) => p.lat));

// import mock dynamically
const { createMockGpxSession } = await import('../src/data/mockGpx.js');
const mock = createMockGpxSession();
const mockPts = mock.allPoints.map((p) => ({
  time: p.timestamp,
  lat: p.lat,
  lon: p.lng,
  speedMps: p.speedMps,
}));

console.log('\n=== MOCK CRUISE (truth: 12.4 kn @ 142°) ===');
const lead = mockPts.slice(0, mock.segments.run.start).filter((p) => p.lat);
const trail = mockPts.slice(mock.segments.run.end + 1).filter((p) => p.lat);
const standingLead = mockPts.slice(12, 49).filter((p) => p.lat);
analyzeSegment('full lead-in trim', lead);
analyzeSegment('standing only 12-48', standingLead);
analyzeSegment('trail-out', trail);
