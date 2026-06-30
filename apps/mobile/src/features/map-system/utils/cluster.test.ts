import { buildClusterIndex, getClusters, regionToZoom, zoomToLongitudeDelta } from './cluster';
import type { Report } from '@/features/upload-report/types';
import type { MapRegion } from '../types';

function makeReport(id: string, lat: number, lng: number, severity: Report['severity'] = 'LOW'): Report {
  return {
    id,
    userId: 'u1',
    cropType: 'Tomato',
    imageUrl: 'https://cdn.example/x.jpg',
    imagePublicId: 'x',
    notes: null,
    latitude: lat,
    longitude: lng,
    disease: 'Tomato Late Blight',
    confidence: 90,
    severity,
    recommendations: [],
    processingStatus: 'SUCCESS',
    aiError: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const wideRegion: MapRegion = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 18,
  longitudeDelta: 18,
};

describe('regionToZoom', () => {
  it('returns a higher zoom for a smaller delta', () => {
    const zoomedOut = regionToZoom({ ...wideRegion, longitudeDelta: 60 });
    const zoomedIn = regionToZoom({ ...wideRegion, longitudeDelta: 0.05 });
    expect(zoomedIn).toBeGreaterThan(zoomedOut);
  });

  it('clamps to the 0-20 range', () => {
    expect(regionToZoom({ ...wideRegion, longitudeDelta: 360 })).toBe(0);
    expect(regionToZoom({ ...wideRegion, longitudeDelta: 0.00001 })).toBeLessThanOrEqual(20);
  });
});

describe('zoomToLongitudeDelta', () => {
  it('is the inverse of regionToZoom for representative zooms', () => {
    for (const zoom of [0, 4, 8, 12, 16]) {
      const delta = zoomToLongitudeDelta(zoom);
      expect(regionToZoom({ ...wideRegion, longitudeDelta: delta })).toBe(zoom);
    }
  });

  it('halves the delta for each zoom increment', () => {
    expect(zoomToLongitudeDelta(5)).toBeCloseTo(zoomToLongitudeDelta(4) / 2, 9);
  });

  it('clamps out-of-range zooms', () => {
    expect(zoomToLongitudeDelta(-5)).toBe(360);
    expect(zoomToLongitudeDelta(99)).toBe(zoomToLongitudeDelta(20));
  });
});

describe('getClusters', () => {
  it('clusters nearby points and returns leaves for distant ones', () => {
    const index = buildClusterIndex([
      makeReport('a', 18.52, 73.85),
      makeReport('b', 18.521, 73.851),
      makeReport('c', 18.522, 73.852),
      makeReport('d', 28.61, 77.2), // Delhi — far away
    ]);
    const region: MapRegion = {
      latitude: 22,
      longitude: 75,
      latitudeDelta: 30,
      longitudeDelta: 30,
    };
    const features = getClusters(index, region);
    // The 3 Pune points should collapse into a cluster; Delhi stays a leaf.
    const totalPoints = features.reduce((sum, f) => {
      const props = f.properties;
      return sum + ('cluster' in props && props.cluster ? props.point_count : 1);
    }, 0);
    expect(totalPoints).toBe(4);
    expect(features.length).toBeLessThan(4);
  });

  it('does not throw for an edge region (poles / antimeridian)', () => {
    const index = buildClusterIndex([makeReport('a', 0, 179.9)]);
    const region: MapRegion = {
      latitude: 89,
      longitude: 179,
      latitudeDelta: 40,
      longitudeDelta: 40,
    };
    expect(() => getClusters(index, region)).not.toThrow();
  });

  it('returns an empty array when there are no reports', () => {
    const index = buildClusterIndex([]);
    expect(getClusters(index, wideRegion)).toEqual([]);
  });
});
