import { formatDistanceKm, haversineKm } from './haversine';

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
    expect(haversineKm(10, 20, 30, 40)).toBeCloseTo(haversineKm(30, 40, 10, 20), 9);
  });
});

describe('formatDistanceKm', () => {
  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistanceKm(0.42)).toBe('420 m');
    expect(formatDistanceKm(0)).toBe('0 m');
  });

  it('formats < 10km with one decimal', () => {
    expect(formatDistanceKm(3.456)).toBe('3.5 km');
    expect(formatDistanceKm(1)).toBe('1.0 km');
  });

  it('rounds >= 10km to whole kilometres', () => {
    expect(formatDistanceKm(12.4)).toBe('12 km');
    expect(formatDistanceKm(125.9)).toBe('126 km');
  });
});
