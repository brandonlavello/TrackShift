import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { correctTrack } from '@/lib/correction';
import {
  averageSpeedKph,
  elapsedSeconds,
  pathDistanceMeters,
  paceSecondsPerKm,
  segmentDeviceDistance,
} from '@/lib/distance';
import { formatPacePerKm } from '@/lib/format';
import {
  detectRunSegmentAuto,
  estimateShipMotionFromTrimEdges,
  shouldAutoApplyEstimate,
  trimAfterSegment,
  trimBeforeSegment,
  type ShipMotionEstimate,
} from '@/lib/metrics';
import { parseActivityFile } from '@/lib/parseActivity';
import { toMapPoints } from '@/lib/trackNormalize';
import type {
  ActivityTrack,
  CorrectionSettings,
  FitParseDebug,
  SegmentRange,
  TrackPoint,
} from '@/lib/trackTypes';

const DEFAULT_CORRECTION: CorrectionSettings = {
  shipSpeedKnots: 0,
  shipHeadingDeg: 0,
  strengthPercent: 0,
  mode: 'off',
};

function defaultRunSegment(pointCount: number): SegmentRange {
  const end = Math.max(0, pointCount - 1);
  return { start: 0, end, label: 'Run' };
}

function computeTrackStats(points: TrackPoint[]) {
  const distance = pathDistanceMeters(points);
  const elapsed = elapsedSeconds(points);
  const deviceDistance = segmentDeviceDistance(points);

  return {
    distanceMeters: distance,
    deviceDistanceMeters: deviceDistance,
    elapsedSeconds: elapsed,
    avgPacePerKm: formatPacePerKm(paceSecondsPerKm(distance, elapsed)),
    avgSpeedKph: averageSpeedKph(distance, elapsed),
    pointCount: points.length,
  };
}

export const useGpxStore = defineStore('gpx', () => {
  const hasFile = ref(false);
  const fileName = ref('');
  const uploadedAt = ref<Date | null>(null);
  const loadError = ref('');
  const isLoading = ref(false);

  const activityTrack = ref<ActivityTrack | null>(null);
  const fitDebug = ref<FitParseDebug | null>(null);

  const allPoints = ref<TrackPoint[]>([]);
  const runPoints = ref<TrackPoint[]>([]);
  const correctedRunPoints = ref<TrackPoint[]>([]);

  const segments = ref({
    run: defaultRunSegment(0),
  });

  const correction = ref<CorrectionSettings>({ ...DEFAULT_CORRECTION });
  const estimatedCorrection = ref<ShipMotionEstimate | null>(null);

  function valuesMatchEstimate(values: CorrectionSettings = correction.value): boolean {
    const estimate = estimatedCorrection.value;
    if (!estimate || estimate.confidenceLabel === 'None') return false;

    return (
      Math.abs(values.shipSpeedKnots - estimate.shipSpeedKnots) < 0.05 &&
      values.shipHeadingDeg === estimate.shipHeadingDeg &&
      values.strengthPercent === estimate.strengthPercent
    );
  }

  const hasEstimate = computed(
    () =>
      estimatedCorrection.value != null &&
      estimatedCorrection.value.confidenceLabel !== 'None' &&
      estimatedCorrection.value.shipSpeedKnots > 0,
  );

  const isEstimateApplied = computed(
    () =>
      hasEstimate.value &&
      correction.value.mode === 'estimated' &&
      valuesMatchEstimate() &&
      correction.value.shipSpeedKnots > 0,
  );

  const canReapplyEstimate = computed(
    () =>
      hasEstimate.value &&
      (correction.value.mode === 'manual' || !valuesMatchEstimate()),
  );

  const stats = ref({
    source: '—' as string,
    raw: {
      distanceMeters: 0,
      deviceDistanceMeters: undefined as number | undefined,
      elapsedSeconds: 0,
      avgPacePerKm: '—',
      avgSpeedKph: 0,
      pointCount: 0,
    },
    corrected: {
      distanceMeters: 0,
      deviceDistanceMeters: undefined as number | undefined,
      elapsedSeconds: 0,
      avgPacePerKm: '—',
      avgSpeedKph: 0,
      pointCount: 0,
    },
    correction: {
      shipSpeedKnots: 0,
      shipHeadingDeg: 0,
      strengthPercent: 0,
      trimmedDistanceMeters: 0,
    },
  });

  const quality = ref({
    alignmentScore: 0,
    confidenceLabel: '—',
    calibrationDurationSec: 0,
    calibrationResidualMeters: 0,
    loopClosureErrorMeters: 0,
    compactness: 0,
    speedSpikeWarnings: 0,
  });

  const mapPoints = computed(() => toMapPoints(allPoints.value));
  const correctedMapPoints = computed(() => toMapPoints(correctedRunPoints.value));

  const trimBefore = computed(() =>
    trimBeforeSegment(segments.value.run.start),
  );
  const trimAfter = computed(() =>
    trimAfterSegment(segments.value.run.end, allPoints.value.length),
  );

  function recomputeEstimate() {
    const { start, end } = segments.value.run;
    estimatedCorrection.value = estimateShipMotionFromTrimEdges(allPoints.value, start, end);

    if (estimatedCorrection.value) {
      quality.value = {
        ...quality.value,
        confidenceLabel: estimatedCorrection.value.confidenceLabel,
        calibrationDurationSec: estimatedCorrection.value.sampleDurationSec,
        calibrationResidualMeters: estimatedCorrection.value.residualMeters,
      };
    }
  }

  function applyEstimatedCorrection() {
    if (!estimatedCorrection.value || estimatedCorrection.value.confidenceLabel === 'None') {
      return;
    }

    correction.value = {
      shipSpeedKnots: estimatedCorrection.value.shipSpeedKnots,
      shipHeadingDeg: estimatedCorrection.value.shipHeadingDeg,
      strengthPercent: estimatedCorrection.value.strengthPercent,
      mode: 'estimated',
    };
    recomputeCorrectedPreview();
  }

  function resetCorrection() {
    const { strengthPercent } = correction.value;
    correction.value = {
      shipSpeedKnots: 0,
      shipHeadingDeg: 0,
      strengthPercent: strengthPercent || 100,
      mode: strengthPercent > 0 ? 'manual' : 'off',
    };
    recomputeCorrectedPreview();
  }

  function reapplyEstimate() {
    recomputeEstimate();
    applyEstimatedCorrection();
  }

  function analyzeAndApplyShipMotion(options: { detectRun?: boolean } = {}) {
    if (options.detectRun !== false) {
      const detectedRun = detectRunSegmentAuto(allPoints.value);
      if (detectedRun) {
        updateRunSegment(
          {
            start: detectedRun.start,
            end: detectedRun.end,
            label: detectedRun.label,
          },
          { reanalyze: false },
        );
      }
    }
    recomputeEstimate();
    if (shouldAutoApplyEstimate(estimatedCorrection.value)) {
      applyEstimatedCorrection();
    } else {
      correction.value = { ...DEFAULT_CORRECTION };
      recomputeCorrectedPreview();
    }
  }

  const isReady = computed(() => hasFile.value && runPoints.value.length > 0);
  const canExport = computed(() => isReady.value && correctedRunPoints.value.length > 0);

  function recomputeCorrectedPreview() {
    if (!runPoints.value.length) {
      correctedRunPoints.value = [];
      return;
    }

    correctedRunPoints.value = correctTrack(runPoints.value, correction.value, 0);
    refreshStats();
  }

  function refreshStats() {
    const rawStats = computeTrackStats(runPoints.value);
    const correctedStats = computeTrackStats(correctedRunPoints.value);

    stats.value = {
      source: activityTrack.value?.source?.toUpperCase() ?? '—',
      raw: rawStats,
      corrected: correctedStats,
      correction: {
        shipSpeedKnots: correction.value.shipSpeedKnots,
        shipHeadingDeg: correction.value.shipHeadingDeg,
        strengthPercent: correction.value.strengthPercent,
        trimmedDistanceMeters: Math.max(
          0,
          rawStats.distanceMeters - correctedStats.distanceMeters,
        ),
      },
    };
  }

  function applyActivity(
    activity: ActivityTrack,
    debug?: FitParseDebug,
    options: { skipShipMotionAnalysis?: boolean } = {},
  ) {
    hasFile.value = true;
    fileName.value = activity.fileName;
    uploadedAt.value = new Date();
    activityTrack.value = activity;
    fitDebug.value = debug ?? null;
    allPoints.value = activity.points;
    segments.value = {
      run: defaultRunSegment(activity.points.length),
    };
    correction.value = { ...DEFAULT_CORRECTION };
    estimatedCorrection.value = null;
    runPoints.value = [...activity.points];
    recomputeCorrectedPreview();
    if (!options.skipShipMotionAnalysis) {
      analyzeAndApplyShipMotion();
    }
    loadError.value = '';
  }

  async function loadFile(file: File) {
    isLoading.value = true;
    loadError.value = '';
    try {
      const result = await parseActivityFile(file);
      applyActivity(result.activity, result.fitDebug);
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : 'Failed to parse file.';
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  function clearSession() {
    hasFile.value = false;
    fileName.value = '';
    uploadedAt.value = null;
    activityTrack.value = null;
    fitDebug.value = null;
    allPoints.value = [];
    runPoints.value = [];
    correctedRunPoints.value = [];
    loadError.value = '';
    segments.value = {
      run: defaultRunSegment(0),
    };
    correction.value = { ...DEFAULT_CORRECTION };
    estimatedCorrection.value = null;
    stats.value = {
      source: '—',
      raw: {
        distanceMeters: 0,
        deviceDistanceMeters: undefined,
        elapsedSeconds: 0,
        avgPacePerKm: '—',
        avgSpeedKph: 0,
        pointCount: 0,
      },
      corrected: {
        distanceMeters: 0,
        deviceDistanceMeters: undefined,
        elapsedSeconds: 0,
        avgPacePerKm: '—',
        avgSpeedKph: 0,
        pointCount: 0,
      },
      correction: {
        shipSpeedKnots: 0,
        shipHeadingDeg: 0,
        strengthPercent: 0,
        trimmedDistanceMeters: 0,
      },
    };
  }

  function updateCorrection(partial: Partial<CorrectionSettings>) {
    const next: CorrectionSettings = { ...correction.value, ...partial };
    let mode = partial.mode;
    if (mode === undefined) {
      mode =
        next.shipSpeedKnots === 0 && next.strengthPercent === 0 ? 'off' : 'manual';
    }

    correction.value = { ...next, mode };
    recomputeCorrectedPreview();
  }

  function updateRunSegment(
    { start, end, label }: { start: number; end: number; label?: string },
    options: { reanalyze?: boolean } = {},
  ) {
    if (!allPoints.value.length) return;

    const safeStart = Math.max(0, Math.min(start, allPoints.value.length - 1));
    const safeEnd = Math.max(safeStart, Math.min(end, allPoints.value.length - 1));

    segments.value = {
      run: {
        start: safeStart,
        end: safeEnd,
        label: label ?? segments.value.run.label ?? 'Run',
      },
    };

    runPoints.value = allPoints.value.slice(safeStart, safeEnd + 1);
    recomputeCorrectedPreview();

    if (options.reanalyze !== false) {
      recomputeEstimate();
      if (
        correction.value.mode === 'estimated' &&
        shouldAutoApplyEstimate(estimatedCorrection.value)
      ) {
        applyEstimatedCorrection();
      }
    }
  }

  function autoTrimRunSegment(): 'applied' | 'unchanged' | 'failed' {
    const detected = detectRunSegmentAuto(allPoints.value);
    if (!detected) return 'failed';

    const unchanged =
      segments.value.run.start === detected.start &&
      segments.value.run.end === detected.end;
    if (unchanged) return 'unchanged';

    updateRunSegment({
      start: detected.start,
      end: detected.end,
      label: detected.label,
    });
    return 'applied';
  }

  function resetRunSegment() {
    if (!allPoints.value.length) return;

    updateRunSegment({
      start: 0,
      end: allPoints.value.length - 1,
      label: 'Full activity',
    });
  }

  function loadDemoSession() {
    import('@/data/mockGpx').then(({ createMockGpxSession }) => {
      const mock = createMockGpxSession();
      applyActivity(
        {
          source: 'gpx',
          fileName: mock.fileName,
          points: mock.allPoints.map((point) => ({
            time: point.timestamp,
            lat: point.lat,
            lon: point.lng,
            elevation: point.elevation,
            speedMps: point.speedMps,
            source: 'gpx',
          })),
          availableFields: ['time', 'lat', 'lon', 'elevation', 'speedMps', 'source'],
          startTime: mock.allPoints[0]?.timestamp,
          endTime: mock.allPoints.at(-1)?.timestamp,
        },
        undefined,
        { skipShipMotionAnalysis: true },
      );
      segments.value = { run: { ...mock.segments.run } };
      runPoints.value = mock.runPoints.map((point) => ({
        time: point.timestamp,
        lat: point.lat,
        lon: point.lng,
        elevation: point.elevation,
        speedMps: point.speedMps,
        source: 'gpx',
      }));
      quality.value = { ...mock.quality };
      analyzeAndApplyShipMotion({ detectRun: true });
    });
  }

  return {
    hasFile,
    fileName,
    uploadedAt,
    loadError,
    isLoading,
    activityTrack,
    fitDebug,
    allPoints,
    runPoints,
    correctedRunPoints,
    mapPoints,
    correctedMapPoints,
    segments,
    trimBefore,
    trimAfter,
    correction,
    estimatedCorrection,
    hasEstimate,
    isEstimateApplied,
    canReapplyEstimate,
    stats,
    quality,
    isReady,
    canExport,
    loadFile,
    loadDemoSession,
    clearSession,
    updateCorrection,
    updateRunSegment,
    autoTrimRunSegment,
    resetRunSegment,
    applyEstimatedCorrection,
    reapplyEstimate,
    resetCorrection,
    recomputeEstimate,
  };
});
