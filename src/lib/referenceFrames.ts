/**
 * Approximate motion in assorted reference frames — educational Easter egg only.
 * Values are order-of-magnitude estimates, not precision ephemeris.
 */

import type { DistanceUnit } from './format';
import { formatDistance, METERS_PER_MILE } from './format';

/** Surface rotation speed at equator (m/s). */
const EARTH_ROTATION_EQUATOR_MPS = 465.1;
const EARTH_ORBIT_MPS = 29_780;
/** Sun's orbital speed around the Galactic center (m/s). */
const SUN_GALACTIC_ORBIT_MPS = 220_000;
/** Milky Way bulk motion relative to the CMB (m/s). */
const MILKY_WAY_CMB_MPS = 552_000;
/** Solar system velocity relative to the CMB (m/s) — practical local universal frame. */
const SOLAR_SYSTEM_CMB_MPS = 369_000;

export interface ReferenceFrameRow {
  id: string;
  name: string;
  description: string;
  speedMps: number;
  distanceMeters: number;
  directionNote: string;
  diagramRing?: 'earth' | 'orbit' | 'galaxy' | 'cmb';
}

export interface NerdsStatsInput {
  elapsedSeconds: number;
  latitudeDeg: number;
  surfaceDistanceMeters: number;
  surfaceSpeedMps: number;
}

export function computeReferenceFrameMotions(input: NerdsStatsInput): ReferenceFrameRow[] {
  const { elapsedSeconds, latitudeDeg, surfaceDistanceMeters, surfaceSpeedMps } = input;
  const t = Math.max(elapsedSeconds, 0);
  const latRad = (latitudeDeg * Math.PI) / 180;
  const rotationMps = EARTH_ROTATION_EQUATOR_MPS * Math.cos(latRad);

  const rows: ReferenceFrameRow[] = [
    {
      id: 'surface',
      name: 'Your run (surface GPS)',
      description: 'Corrected track on Earth’s surface — what your watch measures after ship correction.',
      speedMps: surfaceSpeedMps,
      distanceMeters: surfaceDistanceMeters,
      directionNote: 'Along your running path',
    },
    {
      id: 'earth-rotation',
      name: 'Earth’s rotation',
      description: 'How fast you’re carried eastward by Earth spinning, relative to Earth’s center.',
      speedMps: rotationMps,
      distanceMeters: rotationMps * t,
      directionNote: `East along the ${Math.abs(latitudeDeg).toFixed(0)}° parallel`,
      diagramRing: 'earth',
    },
    {
      id: 'earth-orbit',
      name: 'Earth orbiting the Sun',
      description: 'Earth’s orbital speed around the Sun (heliocentric frame).',
      speedMps: EARTH_ORBIT_MPS,
      distanceMeters: EARTH_ORBIT_MPS * t,
      directionNote: 'Tangent to Earth’s orbit (~counterclockwise from north)',
      diagramRing: 'orbit',
    },
    {
      id: 'sun-galaxy',
      name: 'Sun orbiting the Milky Way',
      description: 'The Solar System’s speed as the Sun orbits the Galactic center.',
      speedMps: SUN_GALACTIC_ORBIT_MPS,
      distanceMeters: SUN_GALACTIC_ORBIT_MPS * t,
      directionNote: 'Toward the Galactic center region (roughly)',
      diagramRing: 'galaxy',
    },
    {
      id: 'milky-way',
      name: 'Milky Way through space',
      description: 'Bulk motion of the Galaxy relative to the cosmic microwave background.',
      speedMps: MILKY_WAY_CMB_MPS,
      distanceMeters: MILKY_WAY_CMB_MPS * t,
      directionNote: 'Toward the Shapley / Great Attractor region (approx.)',
      diagramRing: 'galaxy',
    },
    {
      id: 'cmb',
      name: 'Cosmic microwave background',
      description:
        'Solar System motion relative to the CMB — the closest practical “universal” rest frame.',
      speedMps: SOLAR_SYSTEM_CMB_MPS,
      distanceMeters: SOLAR_SYSTEM_CMB_MPS * t,
      directionNote: 'Toward Leo / Hydra (CMB dipole direction, approx.)',
      diagramRing: 'cmb',
    },
  ];

  return rows;
}

export function formatCosmicSpeed(mps: number, unit: DistanceUnit = 'km'): string {
  if (!Number.isFinite(mps) || mps < 0) return '—';

  const kmh = mps * 3.6;
  if (mps >= 1000) {
    if (unit === 'mi') {
      const mis = mps / METERS_PER_MILE;
      return `${mis.toLocaleString(undefined, { maximumFractionDigits: 1 })} mi/s`;
    }
    return `${(mps / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km/s`;
  }
  if (kmh >= 1000) {
    if (unit === 'mi') {
      return `${Math.round(kmh * 0.621371).toLocaleString()} mph`;
    }
    return `${Math.round(kmh).toLocaleString()} km/h`;
  }
  if (unit === 'mi') {
    return `${(kmh * 0.621371).toFixed(1)} mph`;
  }
  return `${kmh.toFixed(1)} km/h`;
}

export function formatCosmicDistance(meters: number, unit: DistanceUnit = 'km'): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';

  if (meters >= 1_000_000_000) {
    const au = meters / 149_597_870_700;
    if (au >= 1) return `${au.toFixed(2)} AU`;
    if (unit === 'mi') {
      return `${(meters / METERS_PER_MILE / 1_000_000).toFixed(1)} million mi`;
    }
    return `${(meters / 1_000_000).toFixed(1)} million km`;
  }
  if (meters >= 1_000_000) {
    if (unit === 'mi') {
      return `${(meters / METERS_PER_MILE / 1_000_000).toFixed(2)} million mi`;
    }
    return `${(meters / 1_000_000).toFixed(2)} million km`;
  }
  return formatDistance(meters, unit);
}
