export type TrackSource = 'fit' | 'gpx';

export type TrackPoint = {
  time: Date;
  lat?: number;
  lon?: number;
  elevation?: number;
  speedMps?: number;
  distanceMeters?: number;
  cadence?: number;
  heartRate?: number;
  source: TrackSource;
  raw?: Record<string, unknown>;
};

export type ActivityTrack = {
  source: TrackSource;
  fileName: string;
  points: TrackPoint[];
  availableFields: string[];
  startTime?: Date;
  endTime?: Date;
  /** Total distance from device/session when available (meters). */
  deviceDistanceMeters?: number;
};

export type CorrectionSettings = {
  shipSpeedKnots: number;
  shipHeadingDeg: number;
  strengthPercent: number;
  mode: 'manual' | 'estimated' | 'off';
};

export type FitParseDebug = {
  fileType: 'fit';
  rawRecordCount: number;
  usableGpsCount: number;
  availableFields: string[];
  firstUsablePoint?: TrackPoint;
  lastUsablePoint?: TrackPoint;
  sampleRawRecord?: Record<string, unknown>;
};

export type SegmentRange = {
  start: number;
  end: number;
  label: string;
};

export type MapPoint = {
  lat: number;
  lon: number;
  time: Date;
  elevation?: number;
};
