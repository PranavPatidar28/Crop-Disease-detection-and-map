import { boundingBox, haversineKm, kmPerDegLng, rollingCentroid } from './geo.utils';

describe('geo.utils', () => {
  describe('haversineKm', () => {
    it('returns 0 for identical points', () => {
      expect(haversineKm(18.52, 73.85, 18.52, 73.85)).toBeCloseTo(0, 6);
    });

    it('computes a known distance (Pune ↔ Mumbai ≈ 120km)', () => {
      const d = haversineKm(18.5204, 73.8567, 19.076, 72.8777);
      expect(d).toBeGreaterThan(115);
      expect(d).toBeLessThan(125);
    });

    it('is symmetric', () => {
      const a = haversineKm(10, 20, 30, 40);
      const b = haversineKm(30, 40, 10, 20);
      expect(a).toBeCloseTo(b, 9);
    });
  });

  describe('boundingBox', () => {
    it('produces a box that contains the center', () => {
      const box = boundingBox(18.52, 73.85, 5);
      expect(box.minLat).toBeLessThan(18.52);
      expect(box.maxLat).toBeGreaterThan(18.52);
      expect(box.minLng).toBeLessThan(73.85);
      expect(box.maxLng).toBeGreaterThan(73.85);
    });

    it('clamps latitude to [-90, 90] near the poles', () => {
      const box = boundingBox(89.9, 0, 500);
      expect(box.maxLat).toBeLessThanOrEqual(90);
      expect(box.minLat).toBeGreaterThanOrEqual(-90);

      const south = boundingBox(-89.9, 0, 500);
      expect(south.minLat).toBeGreaterThanOrEqual(-90);
    });

    it('clamps longitude to [-180, 180] near the antimeridian', () => {
      const box = boundingBox(0, 179.9, 500);
      expect(box.maxLng).toBeLessThanOrEqual(180);
      expect(box.minLng).toBeGreaterThanOrEqual(-180);

      const west = boundingBox(0, -179.9, 500);
      expect(west.minLng).toBeGreaterThanOrEqual(-180);
      expect(west.maxLng).toBeLessThanOrEqual(180);
    });

    it('a point within the radius falls inside the box', () => {
      const center = { lat: 18.52, lng: 73.85 };
      const box = boundingBox(center.lat, center.lng, 10);
      // ~3km north-east, well within 10km
      const near = { lat: 18.54, lng: 73.87 };
      expect(near.lat).toBeGreaterThanOrEqual(box.minLat);
      expect(near.lat).toBeLessThanOrEqual(box.maxLat);
      expect(near.lng).toBeGreaterThanOrEqual(box.minLng);
      expect(near.lng).toBeLessThanOrEqual(box.maxLng);
    });
  });

  describe('kmPerDegLng', () => {
    it('is ~111km at the equator and shrinks toward the poles', () => {
      expect(kmPerDegLng(0)).toBeCloseTo(111.32, 1);
      expect(kmPerDegLng(60)).toBeLessThan(kmPerDegLng(0));
      expect(kmPerDegLng(60)).toBeCloseTo(55.66, 0);
    });
  });

  describe('rollingCentroid', () => {
    it('returns the new point when there is no prior', () => {
      const result = rollingCentroid({ lat: 0, lng: 0 }, 0, { lat: 5, lng: 7 });
      expect(result).toEqual({ lat: 5, lng: 7 });
    });

    it('averages weighted by prior count', () => {
      // Prior centroid of 3 points at (0,0), adding (4,8) → (1, 2)
      const result = rollingCentroid({ lat: 0, lng: 0 }, 3, { lat: 4, lng: 8 });
      expect(result.lat).toBeCloseTo(1, 9);
      expect(result.lng).toBeCloseTo(2, 9);
    });

    it('drifts toward the densest area over successive adds', () => {
      let c = { lat: 10, lng: 10 };
      let count = 1;
      for (let i = 0; i < 10; i += 1) {
        c = rollingCentroid(c, count, { lat: 0, lng: 0 });
        count += 1;
      }
      // After many points at the origin, the centroid should be near it.
      expect(c.lat).toBeLessThan(2);
      expect(c.lng).toBeLessThan(2);
    });
  });
});
