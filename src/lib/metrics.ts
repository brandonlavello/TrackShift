import { haversineMeters } from './geo';
import { computeGpsSpeedMps } from './distance';
import { hasUsablePosition } from './trackNormalize';
import type { SegmentRange, TrackPoint } from './trackTypes';

const METERS_PER_DEG_LAT = 111_320;
const KNOTS_TO_MPS = 0.514444;
const MIN_SAMPLE_SEC = 20;
const RUNNING_SPEED_MPS = 1.85;
const RUNNING_GAP_TOLERANCE = 8;
const RUNNING_SMOOTH_WINDOW = 5;
const LOW_ACTIVITY_SPEED_MPS = 1.4;
const STANDING_STILL_SPEED_MPS = 0.8;
const MIN_RUN_POINTS = 20;
const LOOP_PATH_DISPLACEMENT_RATIO = 2.8;
const MIN_LINEAR_DISPLACEMENT_M = 25;

export type ShipMotionEstimate = {
  shipSpeedKnots: number;
  shipHeadingDeg: number;
  strengthPercent: number;
  residualMeters: number;
  sampleDurationSec: number;
  confidenceLabel: 'Good' | 'Fair' | 'Low' | 'None';
  message: string;
  source: 'fit-trim' | 'gps-trim' | 'none';
};

function metersPerDegLng(lat: number) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function displacementVectorMeters(first: TrackPoint, last: TrackPoint) {
  const north = (last.lat! - first.lat!) * METERS_PER_DEG_LAT;
  const east = (last.lon! - first.lon!) * metersPerDegLng(first.lat!);
  return { north, east };
}

function headingFromVector(north: number, east: number): number {
  return (Math.atan2(east, north) * (180 / Math.PI) + 360) % 360;
}

type LinearMotion = {
  northMps: number;
  eastMps: number;
  speedMps: number;
  residualMeters: number;
  durationSec: number;
  displacementMeters: number;
};

function linearRegression(samples: { t: number; v: number }[]) {
  const n = samples.length;
  if (n < 2) return { slope: 0, intercept: 0, rmsResidual: 0 };

  let sumT = 0;
  let sumV = 0;
  let sumTT = 0;
  let sumTV = 0;
  for (const { t, v } of samples) {
    sumT += t;
    sumV += v;
    sumTT += t * t;
    sumTV += t * v;
  }

  const denom = n * sumTT - sumT * sumT;
  const slope = denom === 0 ? 0 : (n * sumTV - sumT * sumV) / denom;
  const intercept = (sumV - slope * sumT) / n;

  let sumSq = 0;
  for (const { t, v } of samples) {
    const err = v - (intercept + slope * t);
    sumSq += err * err;
  }

  return { slope, intercept, rmsResidual: Math.sqrt(sumSq / n) };
}

function estimateLinearMotion(points: TrackPoint[]): LinearMotion | null {
  const positioned = points.filter(hasUsablePosition);
  if (positioned.length < 3) return null;

  const origin = positioned[0];
  const mplng = metersPerDegLng(origin.lat!);
  const t0 = origin.time.getTime();

  const samples = positioned.map((point) => ({
    t: (point.time.getTime() - t0) / 1000,
    north: (point.lat! - origin.lat!) * METERS_PER_DEG_LAT,
    east: (point.lon! - origin.lon!) * mplng,
  }));

  const regNorth = linearRegression(samples.map((s) => ({ t: s.t, v: s.north })));
  const regEast = linearRegression(samples.map((s) => ({ t: s.t, v: s.east })));

  const durationSec = samples.at(-1)!.t;
  const northMps = regNorth.slope;
  const eastMps = regEast.slope;
  const speedMps = Math.hypot(northMps, eastMps);
  const residualMeters = Math.hypot(regNorth.rmsResidual, regEast.rmsResidual);
  const displacementMeters = speedMps * durationSec;

  return {
    northMps,
    eastMps,
    speedMps,
    residualMeters,
    durationSec,
    displacementMeters,
  };
}

function isLoopLikeMotion(points: TrackPoint[]): boolean {
  const positioned = points.filter(hasUsablePosition);
  if (positioned.length < 5) return false;

  const path = pathLengthMeters(positioned);
  const vector = displacementVectorMeters(positioned[0], positioned.at(-1)!);
  const displacement = Math.hypot(vector.north, vector.east);
  if (displacement < 30) return false;

  return path / displacement > LOOP_PATH_DISPLACEMENT_RATIO;
}

function rollingMedian(values: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return values.map((_, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(values.length - 1, index + half);
    const slice = values.slice(start, end + 1).sort((a, b) => a - b);
    return slice[Math.floor(slice.length / 2)];
  });
}

function detectRunningRanges(speeds: number[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let rangeStart = -1;
  let gapCount = 0;
  let lastRunningIndex = -1;

  for (let i = 0; i < speeds.length; i += 1) {
    const isRunning = speeds[i] >= RUNNING_SPEED_MPS;

    if (isRunning) {
      if (rangeStart < 0) rangeStart = i;
      lastRunningIndex = i;
      gapCount = 0;
    } else if (rangeStart >= 0) {
      gapCount += 1;
      if (gapCount > RUNNING_GAP_TOLERANCE) {
        if (lastRunningIndex - rangeStart + 1 >= MIN_RUN_POINTS) {
          ranges.push({ start: rangeStart, end: lastRunningIndex });
        }
        rangeStart = -1;
        gapCount = 0;
        lastRunningIndex = -1;
      }
    }
  }

  if (rangeStart >= 0 && lastRunningIndex - rangeStart + 1 >= MIN_RUN_POINTS) {
    ranges.push({ start: rangeStart, end: lastRunningIndex });
  }

  return ranges;
}

function standingFractionInRange(allPoints: TrackPoint[], start: number, end: number): number {
  let standing = 0;
  let total = 0;
  for (let i = start; i <= end; i += 1) {
    if (!hasUsablePosition(allPoints[i])) continue;
    total += 1;
    if (isStandingStillPoint(allPoints[i])) standing += 1;
  }
  return total ? standing / total : 0;
}

function pathLengthMeters(points: TrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(
      { lat: points[i - 1].lat!, lon: points[i - 1].lon! },
      { lat: points[i].lat!, lon: points[i].lon! },
    );
  }
  return total;
}

function hasFitSpeedData(points: TrackPoint[]): boolean {
  return points.some((point) => point.speedMps != null);
}

function isLowActivityPoint(point: TrackPoint): boolean {
  if (point.speedMps == null) return true;
  return point.speedMps < LOW_ACTIVITY_SPEED_MPS;
}

function isStandingStillPoint(
  point: TrackPoint,
  gpsSpeedMps?: number,
): boolean {
  if (point.speedMps != null) return point.speedMps < STANDING_STILL_SPEED_MPS;
  if (gpsSpeedMps != null) return gpsSpeedMps < STANDING_STILL_SPEED_MPS;
  return false;
}

function trimStandingStillFromBounds(
  points: TrackPoint[],
  start: number,
  end: number,
  gpsSpeeds: (number | undefined)[],
): { start: number; end: number } {
  let newStart = start;
  let newEnd = end;

  while (
    newStart < newEnd &&
    isStandingStillPoint(points[newStart], gpsSpeeds[newStart])
  ) {
    newStart += 1;
  }

  while (
    newEnd > newStart &&
    isStandingStillPoint(points[newEnd], gpsSpeeds[newEnd])
  ) {
    newEnd -= 1;
  }

  return { start: newStart, end: newEnd };
}

function hasStandingStillAtEdges(
  points: TrackPoint[],
  start: number,
  end: number,
  gpsSpeeds: (number | undefined)[],
): boolean {
  const leading =
    start > 0 &&
    isStandingStillPoint(points[0], gpsSpeeds[0]);
  const trailing =
    end < points.length - 1 &&
    isStandingStillPoint(points.at(-1)!, gpsSpeeds[points.length - 1]);
  return leading || trailing;
}

function confidenceFromSignals(
  durationSec: number,
  residualMeters: number,
  displacementMeters: number,
): ShipMotionEstimate['confidenceLabel'] {
  if (durationSec < MIN_SAMPLE_SEC || displacementMeters < MIN_LINEAR_DISPLACEMENT_M) return 'None';

  const residualRatio = residualMeters / Math.max(displacementMeters, 1);
  if (residualRatio <= 0.04 && durationSec >= 30) return 'Good';
  if (residualRatio <= 0.1 && durationSec >= MIN_SAMPLE_SEC) return 'Fair';
  if (residualRatio <= 0.2) return 'Low';
  return 'None';
}

function estimateFromPoints(
  segment: TrackPoint[],
  source: ShipMotionEstimate['source'],
): ShipMotionEstimate | null {
  if (segment.length < 3) return null;
  if (isLoopLikeMotion(segment)) return null;

  const motion = estimateLinearMotion(segment);
  if (!motion) return null;

  const { northMps, eastMps, durationSec, displacementMeters, residualMeters } = motion;
  const confidenceLabel = confidenceFromSignals(
    durationSec,
    residualMeters,
    displacementMeters,
  );

  if (confidenceLabel === 'None') {
    return {
      shipSpeedKnots: 0,
      shipHeadingDeg: 0,
      strengthPercent: 0,
      residualMeters: Math.round(residualMeters * 10) / 10,
      sampleDurationSec: Math.round(durationSec),
      confidenceLabel,
      source,
      message:
        durationSec < MIN_SAMPLE_SEC
          ? 'Trimmed edge is too short — widen the run window or include more lead-in time.'
          : 'Trimmed edges do not show a clear linear ship-motion signal.',
    };
  }

  const speedKnots = motion.speedMps / KNOTS_TO_MPS;
  const headingDeg = headingFromVector(northMps, eastMps);

  return {
    shipSpeedKnots: Math.round(speedKnots * 10) / 10,
    shipHeadingDeg: Math.round(headingDeg),
    strengthPercent: 100,
    residualMeters: Math.round(residualMeters * 10) / 10,
    sampleDurationSec: Math.round(durationSec),
    confidenceLabel,
    source,
    message:
      source === 'fit-trim'
        ? 'Estimated from low-speed FIT samples in trimmed lead-in/trail-out.'
        : 'Estimated from GPS drift in trimmed lead-in/trail-out.',
  };
}

function findContiguousRanges(
  allPoints: TrackPoint[],
  indices: number[],
): { start: number; end: number }[] {
  if (!indices.length) return [];

  const ranges: { start: number; end: number }[] = [];
  let rangeStart = indices[0];
  let rangeEnd = indices[0];

  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] === rangeEnd + 1) {
      rangeEnd = indices[i];
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd });
      rangeStart = indices[i];
      rangeEnd = indices[i];
    }
  }
  ranges.push({ start: rangeStart, end: rangeEnd });
  return ranges;
}

function lowActivityRangesInSlice(allPoints: TrackPoint[], start: number, end: number) {
  if (end <= start) return [];

  const indices = [];
  for (let i = start; i <= end; i += 1) {
    const point = allPoints[i];
    if (hasUsablePosition(point) && isLowActivityPoint(point)) {
      indices.push(i);
    }
  }

  return findContiguousRanges(allPoints, indices);
}

function standingStillRangesInSlice(allPoints: TrackPoint[], start: number, end: number) {
  if (end <= start) return [];

  const indices = [];
  for (let i = start; i <= end; i += 1) {
    const point = allPoints[i];
    if (hasUsablePosition(point) && isStandingStillPoint(point)) {
      indices.push(i);
    }
  }

  return findContiguousRanges(allPoints, indices);
}

type EstimateCandidate = {
  estimate: ShipMotionEstimate;
  standingFraction: number;
  isLeadIn: boolean;
};

function headingDeltaDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function pickBestEstimate(candidates: EstimateCandidate[]): ShipMotionEstimate | null {
  if (!candidates.length) return null;

  const usable = candidates.filter((c) => c.estimate.confidenceLabel !== 'None');
  if (!usable.length) return null;

  const score = (candidate: EstimateCandidate) => {
    const { estimate, standingFraction, isLeadIn } = candidate;
    const confidence =
      estimate.confidenceLabel === 'Good' ? 3 : estimate.confidenceLabel === 'Fair' ? 2 : 1;
    const linearity =
      estimate.residualMeters > 0
        ? Math.min(estimate.sampleDurationSec, 120) / estimate.residualMeters
        : 0;
    const standingBonus = 1 + standingFraction * 2 + (isLeadIn ? 0.35 : 0);
    return confidence * linearity * standingBonus;
  };

  const sorted = [...usable].sort((a, b) => score(b) - score(a));
  const best = sorted[0];

  const agreeing = sorted.filter((candidate) => {
    const speedRatio = Math.abs(
      candidate.estimate.shipSpeedKnots - best.estimate.shipSpeedKnots,
    ) / Math.max(best.estimate.shipSpeedKnots, 0.1);
    const headingDiff = headingDeltaDeg(
      candidate.estimate.shipHeadingDeg,
      best.estimate.shipHeadingDeg,
    );
    return speedRatio <= 0.25 && headingDiff <= 30;
  });

  if (agreeing.length >= 2) {
    return best.estimate;
  }

  const standingPreferred =
    sorted.find((candidate) => candidate.standingFraction >= 0.5) ?? best;
  return standingPreferred.estimate;
}

/**
 * Estimate ship motion from trimmed activity edges (before run start / after run end).
 * Prefers FIT speed to isolate low-activity samples where GPS drift ≈ ship motion.
 */
export function estimateShipMotionFromTrimEdges(
  allPoints: TrackPoint[],
  runStart: number,
  runEnd: number,
): ShipMotionEstimate | null {
  const useFitSpeed = hasFitSpeedData(allPoints);
  const candidates: EstimateCandidate[] = [];

  const trimRanges: { start: number; end: number; isLeadIn: boolean }[] = [];
  if (runStart > 0) trimRanges.push({ start: 0, end: runStart - 1, isLeadIn: true });
  if (runEnd < allPoints.length - 1) {
    trimRanges.push({ start: runEnd + 1, end: allPoints.length - 1, isLeadIn: false });
  }

  for (const trim of trimRanges) {
    const rangeSets = useFitSpeed
      ? [
          ...standingStillRangesInSlice(allPoints, trim.start, trim.end),
          ...lowActivityRangesInSlice(allPoints, trim.start, trim.end),
        ]
      : [{ start: trim.start, end: trim.end }];

    const seen = new Set<string>();
    for (const range of rangeSets) {
      const key = `${range.start}-${range.end}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const segment = allPoints.slice(range.start, range.end + 1).filter(hasUsablePosition);
      if (segment.length < 3) continue;

      const estimate = estimateFromPoints(segment, useFitSpeed ? 'fit-trim' : 'gps-trim');
      if (!estimate || estimate.confidenceLabel === 'None') continue;

      candidates.push({
        estimate,
        standingFraction: standingFractionInRange(allPoints, range.start, range.end),
        isLeadIn: trim.isLeadIn,
      });
    }
  }

  const best = pickBestEstimate(candidates);
  if (best) return best;

  return {
    shipSpeedKnots: 0,
    shipHeadingDeg: 0,
    strengthPercent: 0,
    residualMeters: 0,
    sampleDurationSec: 0,
    confidenceLabel: 'None',
    source: 'none',
    message: useFitSpeed
      ? 'No usable low-speed FIT samples in trimmed edges. Adjust run start/end to leave more lead-in or cool-down.'
      : 'No usable GPS drift in trimmed edges. Adjust run start/end to leave more lead-in or cool-down.',
  };
}

/**
 * Detect the main running window from FIT device speed.
 */
export function detectRunSegmentFromFit(points: TrackPoint[]): SegmentRange | null {
  if (!hasFitSpeedData(points)) return null;

  const speeds = rollingMedian(
    points.map((point) => point.speedMps ?? 0),
    RUNNING_SMOOTH_WINDOW,
  );
  const ranges = detectRunningRanges(speeds);
  if (!ranges.length) return null;

  const best = ranges.reduce((longest, current) => {
    const currentLen = current.end - current.start;
    const longestLen = longest.end - longest.start;
    return currentLen > longestLen ? current : longest;
  });

  return {
    start: best.start,
    end: best.end,
    label: 'Auto-detected run',
  };
}

/**
 * Auto-detect the run window: FIT running speed when available, then trim
 * standing-still samples from the start/end of the detected (or full) window.
 */
export function detectRunSegmentAuto(points: TrackPoint[]): SegmentRange | null {
  if (!points.length) return null;

  const gpsSpeeds = computeGpsSpeedMps(points);
  const fitRun = detectRunSegmentFromFit(points);

  if (fitRun) {
    const trimmed = trimStandingStillFromBounds(
      points,
      fitRun.start,
      fitRun.end,
      gpsSpeeds,
    );
    if (trimmed.end - trimmed.start + 1 >= MIN_RUN_POINTS) {
      return { ...fitRun, start: trimmed.start, end: trimmed.end };
    }
    return fitRun;
  }

  const fullBounds = { start: 0, end: points.length - 1 };
  if (!hasStandingStillAtEdges(points, fullBounds.start, fullBounds.end, gpsSpeeds)) {
    return null;
  }

  const trimmed = trimStandingStillFromBounds(
    points,
    fullBounds.start,
    fullBounds.end,
    gpsSpeeds,
  );
  if (trimmed.end - trimmed.start + 1 < MIN_RUN_POINTS) return null;

  return {
    start: trimmed.start,
    end: trimmed.end,
    label: 'Auto-trimmed run',
  };
}

export function trimBeforeSegment(runStart: number): SegmentRange | null {
  if (runStart <= 0) return null;
  return { start: 0, end: runStart - 1, label: 'Trimmed lead-in' };
}

export function trimAfterSegment(runEnd: number, pointCount: number): SegmentRange | null {
  if (runEnd >= pointCount - 1) return null;
  return { start: runEnd + 1, end: pointCount - 1, label: 'Trimmed trail-out' };
}

export function shouldAutoApplyEstimate(estimate: ShipMotionEstimate | null): boolean {
  return estimate != null && (estimate.confidenceLabel === 'Good' || estimate.confidenceLabel === 'Fair');
}
