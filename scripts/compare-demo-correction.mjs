import { createMockGpxSession, buildCorrectedPoints } from '../src/data/mockGpx.js';
import { correctTrack } from '../src/lib/correction.ts';
import { estimateShipMotionFromTrimEdges } from '../src/lib/metrics.ts';

const mock = createMockGpxSession();
const allPts = mock.allPoints.map((p) => ({
  time: p.timestamp,
  lat: p.lat,
  lon: p.lng,
  speedMps: p.speedMps,
}));
const runPts = mock.runPoints.map((p) => ({
  time: p.timestamp,
  lat: p.lat,
  lon: p.lng,
  speedMps: p.speedMps,
}));

const est = estimateShipMotionFromTrimEdges(
  allPts,
  mock.segments.run.start,
  mock.segments.run.end,
);
console.log('estimate', est);

const correctedViaApp = correctTrack(runPts, {
  shipSpeedKnots: est.shipSpeedKnots,
  shipHeadingDeg: est.shipHeadingDeg,
  strengthPercent: 100,
  mode: 'estimated',
}, 0);

const correctedTruth = buildCorrectedPoints(mock.runPoints, {
  shipSpeedKnots: 12.4,
  shipHeadingDeg: 142,
  strengthPercent: 100,
});

function span(points) {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon ?? p.lng);
  return {
    lat: (Math.max(...lats) - Math.min(...lats)) * 111320,
    lon: (Math.max(...lons) - Math.min(...lons)) * 111320 * Math.cos((lats[0] * Math.PI) / 180),
  };
}

function pathLen(points) {
  let t = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = (b.lat - a.lat) * 111320;
    const dLon = ((b.lon ?? b.lng) - (a.lon ?? a.lng)) * 111320 * Math.cos((a.lat * Math.PI) / 180);
    t += Math.hypot(dLat, dLon);
  }
  return t;
}

console.log('raw run span m', span(runPts));
console.log('app corrected span m', span(correctedViaApp));
console.log('truth corrected span m', span(correctedTruth));
console.log('app path m', pathLen(correctedViaApp).toFixed(0));
console.log('truth path m', pathLen(correctedTruth).toFixed(0));

// compare first corrected point
console.log('app first', correctedViaApp[0].lat, correctedViaApp[0].lon);
console.log('truth first', correctedTruth[0].lat, correctedTruth[0].lng);
