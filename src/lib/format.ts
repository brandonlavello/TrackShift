export type DistanceUnit = 'km' | 'mi';

export const METERS_PER_MILE = 1609.344;
const METERS_PER_KM = 1000;
const FEET_PER_METER = 3.28084;

export function formatDistance(
  meters?: number | null,
  unit: DistanceUnit = 'km',
): string {
  if (meters == null || Number.isNaN(meters)) return '—';

  if (unit === 'mi') {
    const miles = meters / METERS_PER_MILE;
    if (miles >= 0.1) return `${miles.toFixed(2)} mi`;
    return `${Math.round(meters * FEET_PER_METER)} ft`;
  }

  if (meters >= METERS_PER_KM) return `${(meters / METERS_PER_KM).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const whole = Math.round(seconds);
  const hours = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatSpeedKph(
  kph?: number | null,
  unit: DistanceUnit = 'km',
): string {
  if (kph == null || Number.isNaN(kph)) return '—';
  if (unit === 'mi') return `${(kph * 0.621371).toFixed(1)} mph`;
  return `${kph.toFixed(1)} km/h`;
}

export function formatPacePerKm(
  secondsPerKm?: number | null,
  unit: DistanceUnit = 'km',
): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    return '—';
  }

  const secondsPerUnit =
    unit === 'mi' ? secondsPerKm * (METERS_PER_MILE / METERS_PER_KM) : secondsPerKm;
  const mins = Math.floor(secondsPerUnit / 60);
  const secs = Math.round(secondsPerUnit % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function paceUnitLabel(unit: DistanceUnit): string {
  return unit === 'mi' ? '/mi' : '/km';
}

export function speedUnitLabel(unit: DistanceUnit): string {
  return unit === 'mi' ? 'mph' : 'km/h';
}
