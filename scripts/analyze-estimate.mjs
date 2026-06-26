import fs from 'fs';
import { parseFit } from '../src/lib/parseFit.ts';
import {
  detectRunSegmentAuto,
  estimateShipMotionFromTrimEdges,
  shouldAutoApplyEstimate,
} from '../src/lib/metrics.ts';
import { createMockGpxSession } from '../src/data/mockGpx.js';

async function analyze(label, points, runStart, runEnd) {
  const est = estimateShipMotionFromTrimEdges(points, runStart, runEnd);
  console.log(`\n${label}`);
  console.log('  run', runStart, '-', runEnd);
  console.log('  estimate', est);
  console.log('  auto-apply?', shouldAutoApplyEstimate(est));
}

const buf = fs.readFileSync('/Users/brandon/Downloads/22601588442_ACTIVITY.fit');
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const { activity } = await parseFit(ab, 'loop.fit');
const pts = activity.points;
const run = detectRunSegmentAuto(pts);
console.log('=== REAL LOOP FIT ===');
console.log('detected', run);
await analyze('auto', pts, run?.start ?? 0, run?.end ?? pts.length - 1);

const mock = createMockGpxSession();
const mockPts = mock.allPoints.map((p) => ({
  time: p.timestamp,
  lat: p.lat,
  lon: p.lng,
  elevation: p.elevation,
  speedMps: p.speedMps,
  source: 'fit',
}));
console.log('\n=== MOCK CRUISE ===');
const auto = detectRunSegmentAuto(mockPts);
console.log('detected', auto);
await analyze('preset segments', mockPts, mock.segments.run.start, mock.segments.run.end);
if (auto) await analyze('auto segments', mockPts, auto.start, auto.end);
