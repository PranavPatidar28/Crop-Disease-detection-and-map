/**
 * Haversine + bounding-box helpers shared by reports and outbreak modules.
 * Distances in km, coordinates in degrees.
 */

const EARTH_RADIUS_KM = 6371;
const KM_PER_DEG_LAT = 110.574;

export function kmPerDegLng(latDeg: number): number {
  return 111.32 * Math.cos((latDeg * Math.PI) / 180);
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/**
 * Approximate bbox around a center point — sufficient for SQL pre-filtering.
 * Latitude is clamped to [-90, 90]. Longitude is clamped to [-180, 180]; near
 * the antimeridian the clamped box is intentionally conservative (it won't wrap),
 * so callers should always refine with `haversineKm` (which we already do).
 */
export function boundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
  const dLat = radiusKm / KM_PER_DEG_LAT;
  const dLng = radiusKm / Math.max(0.01, kmPerDegLng(lat));
  return {
    minLat: Math.max(-90, lat - dLat),
    maxLat: Math.min(90, lat + dLat),
    minLng: Math.max(-180, lng - dLng),
    maxLng: Math.min(180, lng + dLng),
  };
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Updates a running-average centroid with a new point. Treats the prior centroid
 * as if it represented `priorCount` equal-weight points.
 */
export function rollingCentroid(
  prior: { lat: number; lng: number },
  priorCount: number,
  next: { lat: number; lng: number },
): { lat: number; lng: number } {
  if (priorCount <= 0) return next;
  const total = priorCount + 1;
  return {
    lat: (prior.lat * priorCount + next.lat) / total,
    lng: (prior.lng * priorCount + next.lng) / total,
  };
}
