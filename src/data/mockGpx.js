/**
 * Mock GPS for a run on a moving cruise ship.
 *
 * Imperfect on purpose: variable pace, lane drift per lap, GPS wander, ship wobble.
 * Raw track = ship displacement + messy deck laps. Corrected = ship motion removed.
 */

const KNOTS_TO_MPS = 0.514444;
const METERS_PER_DEG_LAT = 111_320;
const LAP_LENGTH_M = 553;
const BASE_RUNNER_SPEED_MPS = 2.75;
const METERS_PER_MILE = 1609.344;
const DEMO_RUN_MILES = 10;
/** Integrated deck distance — GPS path is slightly longer than integrated distance. */
const TARGET_RUN_DISTANCE_M = DEMO_RUN_MILES * METERS_PER_MILE * 0.97;
const RUN_START_INDEX = 49;
const COOLDOWN_POINT_COUNT = 60;

/**
 * Promenade-deck loop: very long narrow straights, pointy bow arc, rounded stern.
 * North = bow, east = starboard.
 */
function generatePromenadeDeckWaypoints({
  halfWidth = 12,
  straightHalfLength = 200,
  bowDepth = 22,
  sternDepth = 11,
  bowSharpness = 2.6,
  sternRoundness = 0.72,
  samplesPerSegment = 36,
} = {}) {
  const points = [];
  const W = halfWidth;
  const L = straightHalfLength;

  function pushUnique([north, east]) {
    const last = points[points.length - 1];
    if (!last || last[0] !== north || last[1] !== east) {
      points.push([north, east]);
    }
  }

  // Starboard straight — bow to stern along the outer rail.
  for (let i = 0; i <= samplesPerSegment; i += 1) {
    const t = i / samplesPerSegment;
    pushUnique([L - t * 2 * L, W]);
  }

  // Stern cap — gentle rounded aft (flatter arc than the bow).
  for (let i = 1; i <= samplesPerSegment; i += 1) {
    const phi = (i / samplesPerSegment) * Math.PI;
    const bulge = Math.sin(phi) ** sternRoundness;
    pushUnique([-L - sternDepth * bulge, W * Math.cos(phi)]);
  }

  // Port straight — stern back to bow.
  for (let i = 1; i <= samplesPerSegment; i += 1) {
    const t = i / samplesPerSegment;
    pushUnique([-L + t * 2 * L, -W]);
  }

  // Bow cap — sharp tapered front.
  for (let i = 1; i < samplesPerSegment; i += 1) {
    const phi = Math.PI + (i / samplesPerSegment) * Math.PI;
    const bulge = Math.max(0, -Math.sin(phi)) ** bowSharpness;
    pushUnique([L + bowDepth * bulge, W * Math.cos(phi)]);
  }

  return points;
}

const SHIP_DECK_WAYPOINTS = generatePromenadeDeckWaypoints();

function seededRng(seed = 20260625) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function metersPerDegLng(lat) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function shipVelocityMps(speedKnots, headingDeg) {
  const headingRad = (headingDeg * Math.PI) / 180;
  const speedMps = speedKnots * KNOTS_TO_MPS;
  return {
    north: speedMps * Math.cos(headingRad),
    east: speedMps * Math.sin(headingRad),
  };
}

function displacementMeters(velocity, elapsedSec) {
  return {
    north: velocity.north * elapsedSec,
    east: velocity.east * elapsedSec,
  };
}

function metersToLatLng(originLat, originLng, northM, eastM) {
  return {
    lat: originLat + northM / METERS_PER_DEG_LAT,
    lng: originLng + eastM / metersPerDegLng(originLat),
  };
}

function haversineMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function pathDistanceMeters(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(
      { lat: points[i - 1].lat, lng: points[i - 1].lng },
      { lat: points[i].lat, lng: points[i].lng },
    );
  }
  return total;
}

function waypointPerimeter(waypoints) {
  let total = 0;
  for (let i = 0; i < waypoints.length; i += 1) {
    const [n1, e1] = waypoints[i];
    const [n2, e2] = waypoints[(i + 1) % waypoints.length];
    total += Math.hypot(n2 - n1, e2 - e1);
  }
  return total;
}

function scaleWaypointsToLapLength(waypoints, targetMeters) {
  const current = waypointPerimeter(waypoints);
  const scale = targetMeters / current;
  return waypoints.map(([north, east]) => [north * scale, east * scale]);
}

const SCALED_DECK_TRACK = scaleWaypointsToLapLength(SHIP_DECK_WAYPOINTS, LAP_LENGTH_M);

function interpolateDeckTrack(phase) {
  const wrapped = ((phase % 1) + 1) % 1;
  const total = waypointPerimeter(SCALED_DECK_TRACK);
  const target = wrapped * total;

  let walked = 0;
  for (let i = 0; i < SCALED_DECK_TRACK.length; i += 1) {
    const [n1, e1] = SCALED_DECK_TRACK[i];
    const [n2, e2] = SCALED_DECK_TRACK[(i + 1) % SCALED_DECK_TRACK.length];
    const segLen = Math.hypot(n2 - n1, e2 - e1);
    if (walked + segLen >= target) {
      const segT = segLen === 0 ? 0 : (target - walked) / segLen;
      return {
        north: n1 + (n2 - n1) * segT,
        east: e1 + (e2 - e1) * segT,
      };
    }
    walked += segLen;
  }

  const [north, east] = SCALED_DECK_TRACK[0];
  return { north, east };
}

function interpolateDeckTrackByDistance(distanceM) {
  const phase = ((distanceM % LAP_LENGTH_M) + LAP_LENGTH_M) % LAP_LENGTH_M / LAP_LENGTH_M;
  return interpolateDeckTrack(phase);
}

function tangentAtDistance(distanceM) {
  const epsilon = 2.5;
  const p1 = interpolateDeckTrackByDistance(distanceM - epsilon);
  const p2 = interpolateDeckTrackByDistance(distanceM + epsilon);
  const dn = p2.north - p1.north;
  const de = p2.east - p1.east;
  const len = Math.hypot(dn, de) || 1;
  return { north: dn / len, east: de / len };
}

function cornerSlowdownFactor(phase) {
  // Slow on bow/stern caps; hold pace on the long parallel straights.
  const bowCenter = 0.93;
  const sternCenter = 0.43;
  const bow = Math.exp(-((phase - bowCenter) ** 2) / (2 * 0.05 ** 2));
  const stern = Math.exp(-((phase - sternCenter) ** 2) / (2 * 0.06 ** 2));
  return 1 - Math.min(0.15, bow * 0.13 + stern * 0.12);
}

function runnerSpeedMps(runStepIndex, phase, rnd) {
  const fatigue = Math.min(runStepIndex * 0.00006, 0.4);
  const surge = Math.sin(runStepIndex * 0.11) * 0.28 + Math.sin(runStepIndex * 0.037) * 0.15;
  const corner = cornerSlowdownFactor(phase);
  const noise = (rnd() - 0.5) * 0.22;
  const raw = (BASE_RUNNER_SPEED_MPS - fatigue + surge + noise) * corner;
  return Math.max(1.9, Math.min(3.35, raw));
}

function deviceSpeedReading(trueMps, rnd) {
  const bias = 0.97 + rnd() * 0.06;
  const jitter = (rnd() - 0.5) * 0.18;
  return Math.max(0, trueMps * bias + jitter);
}

function applyLapVariation(base, distanceM, lapState, rnd) {
  const tangent = tangentAtDistance(distanceM);
  const perpNorth = -tangent.east;
  const perpEast = tangent.north;
  const alongJitter = (rnd() - 0.5) * 2.2;

  return {
    north: base.north + perpNorth * lapState.lateralOffset + tangent.north * alongJitter,
    east: base.east + perpEast * lapState.lateralOffset + tangent.east * alongJitter,
  };
}

function createGpsNoiseState() {
  return { north: 0, east: 0 };
}

function nextGpsNoise(state, rnd) {
  state.north = state.north * 0.9 + (rnd() - 0.5) * 0.55;
  state.east = state.east * 0.9 + (rnd() - 0.5) * 0.55;

  const white = {
    north: (rnd() - 0.5) * 1.4,
    east: (rnd() - 0.5) * 1.4,
  };

  if (rnd() < 0.008) {
    white.north += (rnd() - 0.5) * 4;
    white.east += (rnd() - 0.5) * 4;
  }

  return {
    north: state.north + white.north,
    east: state.east + white.east,
  };
}

function formatPace(secondsPerKm) {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm)) return '—';
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Build a full activity: warm-up walk, standing lead-in, ~10 mi of laps, standing cool-down.
 */
function buildCruiseShipTrack({
  originLat,
  originLng,
  startTime,
  intervalSec,
  shipSpeedKnots,
  shipHeadingDeg,
  targetRunDistanceM = TARGET_RUN_DISTANCE_M,
  seed = 20260625,
}) {
  const rnd = seededRng(seed);
  const gpsState = createGpsNoiseState();
  const shipVelocity = shipVelocityMps(shipSpeedKnots, shipHeadingDeg);
  const points = [];

  let runnerDistanceM = 0;
  let runStepIndex = 0;
  let currentLap = -1;
  let lapState = { lateralOffset: 0, targetLateralOffset: 0 };
  let runEndIndex = null;
  const LATERAL_RAMP = 0.12;

  function appendPoint(i, runnerNorth, runnerEast, speedMps) {
    const elapsedSec = i * intervalSec;
    const ship = displacementMeters(shipVelocity, elapsedSec);
    const noise = nextGpsNoise(gpsState, rnd);
    const totalNorth = ship.north + runnerNorth + noise.north;
    const totalEast = ship.east + runnerEast + noise.east;
    const { lat, lng } = metersToLatLng(originLat, originLng, totalNorth, totalEast);

    points.push({
      index: i,
      lat,
      lng,
      speedMps,
      elevation: 12 + Math.sin(i * 0.15) * 0.4 + (rnd() - 0.5) * 0.3,
      timestamp: new Date(startTime.getTime() + elapsedSec * 1000),
      _runnerNorth: runnerNorth,
      _runnerEast: runnerEast,
    });
  }

  let i = 0;

  for (; i <= 48; i += 1) {
    let runnerNorth = 0;
    let runnerEast = 0;
    let speedMps = 0;

    if (i < 12) {
      const walkPhase = i / 12;
      runnerNorth = Math.sin(i * 0.4) * 3 + (rnd() - 0.5) * 0.8;
      runnerEast = i * 0.55 + (rnd() - 0.5) * 0.6;
      speedMps = deviceSpeedReading(0.95 + walkPhase * 0.25, rnd);
    } else {
      runnerNorth = Math.sin(i * 0.9) * 0.7 + (rnd() - 0.5) * 0.35;
      runnerEast = Math.cos(i * 1.1) * 0.55 + (rnd() - 0.5) * 0.35;
      speedMps = deviceSpeedReading(0.12 + rnd() * 0.18, rnd);
    }

    appendPoint(i, runnerNorth, runnerEast, speedMps);
  }

  for (; runnerDistanceM < targetRunDistanceM; i += 1) {
    const lap = Math.floor(runnerDistanceM / LAP_LENGTH_M);
    if (lap !== currentLap) {
      currentLap = lap;
      lapState.targetLateralOffset = (rnd() - 0.5) * 1.8;
    }
    lapState.lateralOffset +=
      (lapState.targetLateralOffset - lapState.lateralOffset) * LATERAL_RAMP;

    const phase =
      (((runnerDistanceM % LAP_LENGTH_M) + LAP_LENGTH_M) % LAP_LENGTH_M) / LAP_LENGTH_M;
    const trueSpeed = runnerSpeedMps(runStepIndex, phase, rnd);
    const speedMps = deviceSpeedReading(trueSpeed, rnd);

    const base = interpolateDeckTrackByDistance(runnerDistanceM);
    const varied = applyLapVariation(base, runnerDistanceM, lapState, rnd);

    appendPoint(i, varied.north, varied.east, speedMps);

    runnerDistanceM += trueSpeed * intervalSec;
    runStepIndex += 1;
  }

  runEndIndex = i - 1;

  for (let c = 0; c < COOLDOWN_POINT_COUNT; c += 1, i += 1) {
    const runnerNorth = Math.sin(i * 0.9) * 0.55 + (rnd() - 0.5) * 0.4;
    const runnerEast = Math.cos(i * 1.1) * 0.45 + (rnd() - 0.5) * 0.4;
    const speedMps = deviceSpeedReading(0.1 + rnd() * 0.22, rnd);
    appendPoint(i, runnerNorth, runnerEast, speedMps);
  }

  return {
    points,
    runStart: RUN_START_INDEX,
    runEnd: runEndIndex,
  };
}

/**
 * Subtract estimated ship motion; leaves deck laps behind.
 */
export function buildCorrectedPoints(rawPoints, options = {}) {
  if (!rawPoints.length) return [];

  const {
    shipSpeedKnots = 12.4,
    shipHeadingDeg = 142,
    strengthPercent = 100,
    referenceIndex = 0,
  } = options;

  const strength = strengthPercent / 100;
  const shipVelocity = shipVelocityMps(shipSpeedKnots, shipHeadingDeg);
  const refPoint = rawPoints[referenceIndex] ?? rawPoints[0];

  return rawPoints.map((point) => {
    const elapsedFromRef = (point.timestamp - refPoint.timestamp) / 1000;
    const shipDisp = displacementMeters(shipVelocity, elapsedFromRef);

    const rawFromRefNorth = (point.lat - refPoint.lat) * METERS_PER_DEG_LAT;
    const rawFromRefEast = (point.lng - refPoint.lng) * metersPerDegLng(refPoint.lat);

    const correctedNorth = rawFromRefNorth - shipDisp.north * strength;
    const correctedEast = rawFromRefEast - shipDisp.east * strength;

    const { lat, lng } = metersToLatLng(
      refPoint.lat,
      refPoint.lng,
      correctedNorth,
      correctedEast,
    );

    return {
      index: point.index,
      lat,
      lng,
      elevation: point.elevation,
      timestamp: point.timestamp,
    };
  });
}

export function createMockGpxSession() {
  const shipSpeedKnots = 12.4;
  const shipHeadingDeg = 142;
  const startTime = new Date('2026-06-20T07:12:00Z');
  const intervalSec = 2;

  const { points: allPoints, runStart, runEnd } = buildCruiseShipTrack({
    originLat: 18.42,
    originLng: -65.08,
    startTime,
    intervalSec,
    shipSpeedKnots,
    shipHeadingDeg,
  });

  const runPoints = allPoints.slice(runStart, runEnd + 1);
  const correctedRunPoints = buildCorrectedPoints(runPoints, {
    shipSpeedKnots,
    shipHeadingDeg,
    strengthPercent: 100,
    referenceIndex: 0,
  });

  const rawDistance = pathDistanceMeters(runPoints);
  const correctedDistance = pathDistanceMeters(correctedRunPoints);
  const elapsedSeconds = Math.round(
    (runPoints.at(-1).timestamp - runPoints[0].timestamp) / 1000,
  );

  return {
    fileName: 'cruise-deck-run.gpx',
    uploadedAt: new Date('2026-06-25T14:30:00Z'),
    allPoints,
    segments: {
      run: { start: runStart, end: runEnd, label: 'Run laps' },
    },
    correction: {
      shipSpeedKnots,
      shipHeadingDeg,
      strengthPercent: 100,
      mode: 'estimated',
    },
    stats: {
      raw: {
        distanceMeters: Math.round(rawDistance),
        elapsedSeconds,
        avgPacePerKm: formatPace(elapsedSeconds / (rawDistance / 1000)),
        avgSpeedKph: (rawDistance / elapsedSeconds) * 3.6,
        pointCount: runPoints.length,
      },
      corrected: {
        distanceMeters: Math.round(correctedDistance),
        elapsedSeconds,
        avgPacePerKm: formatPace(elapsedSeconds / (correctedDistance / 1000)),
        avgSpeedKph: (correctedDistance / elapsedSeconds) * 3.6,
        pointCount: correctedRunPoints.length,
      },
      correction: {
        shipSpeedKnots,
        shipHeadingDeg,
        strengthPercent: 100,
        trimmedDistanceMeters: Math.round(rawDistance - correctedDistance),
      },
    },
    quality: {
      alignmentScore: 0.82,
      confidenceLabel: 'Good',
      calibrationDurationSec: 72,
      calibrationResidualMeters: 5.1,
      loopClosureErrorMeters: 18.6,
      compactness: 0.68,
      speedSpikeWarnings: 3,
    },
    runPoints,
    correctedRunPoints,
  };
}

export const MOCK_GPX_SESSION = createMockGpxSession();
