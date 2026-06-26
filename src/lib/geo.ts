const KNOTS_TO_MPS = 0.514444;

export function shipVelocityMps(speedKnots: number, headingDeg: number) {
  const headingRad = (headingDeg * Math.PI) / 180;
  const speedMps = speedKnots * KNOTS_TO_MPS;
  return {
    north: speedMps * Math.cos(headingRad),
    east: speedMps * Math.sin(headingRad),
  };
}

export function displacementMeters(
  velocity: { north: number; east: number },
  elapsedSec: number,
) {
  return {
    north: velocity.north * elapsedSec,
    east: velocity.east * elapsedSec,
  };
}

export function haversineMeters(
  a: { lat: number; lng?: number; lon?: number },
  b: { lat: number; lng?: number; lon?: number },
): number {
  const aLng = a.lng ?? a.lon ?? 0;
  const bLng = b.lng ?? b.lon ?? 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const EARTH_RADIUS_M = 6_371_000;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}
