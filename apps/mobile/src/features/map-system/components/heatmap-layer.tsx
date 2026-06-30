import { useMemo } from 'react';
import { Heatmap } from 'react-native-maps';

import type { MapRegion } from '@/features/map-system/types';
import { regionToZoom } from '@/features/map-system/utils/cluster';
import type { Report } from '@/features/upload-report/types';
import { palette } from '@/theme/colors';

interface HeatmapLayerProps {
  reports: Report[];
  /** Current map region — drives the zoom-adaptive pixel radius. */
  region?: MapRegion;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

/**
 * Severity-weighted density heatmap. Google Maps provider only (Android here,
 * or iOS when PROVIDER_GOOGLE is set) — react-native-maps has no Apple Maps
 * heatmap overlay, so this renders nothing under the default iOS provider.
 *
 * Notes from debugging the previous version:
 *  - Gradient `startPoints` MUST be in the range (0, 1] and strictly increasing.
 *    The old `0.0` start point was rejected by the native Google `Gradient`
 *    builder, so the whole heatmap silently failed to render.
 *  - The native Android tile provider caches and does not reliably re-render
 *    when only the `points` array changes, so we force a remount via `key`
 *    whenever the underlying data changes.
 *  - A fixed pixel radius blobs into one mass at country zoom and shrinks to
 *    dots up close, so the radius adapts to the current zoom level.
 */
export function HeatmapLayer({ reports, region }: HeatmapLayerProps) {
  const points = useMemo(
    () =>
      reports.map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        weight: r.severity === 'HIGH' ? 1 : r.severity === 'MEDIUM' ? 0.6 : 0.3,
      })),
    [reports],
  );

  // Zoom-adaptive pixel radius. Google caps the radius at 10–50px. Higher zoom
  // (points geographically spread out) → larger radius so each point still
  // reads as heat; lower zoom (points project close together) → smaller radius
  // so the map doesn't become one giant blob.
  const radius = useMemo(() => {
    if (!region) return 40;
    const zoom = regionToZoom(region); // 0–20
    return Math.round(clamp(18 + zoom * 1.8, 20, 50));
  }, [region]);

  // Force a remount when the data set changes so the native tile provider
  // rebuilds (it ignores in-place `points` mutations on Android). Cheap content
  // signature: count + a rolling checksum of coordinates and weights.
  const dataKey = useMemo(() => {
    let checksum = 0;
    for (const p of points) {
      checksum = (checksum + p.latitude * 1000 + p.longitude * 1000 + p.weight) % 1_000_000;
    }
    return `${points.length}:${Math.round(checksum)}`;
  }, [points]);

  if (points.length === 0) return null;

  return (
    <Heatmap
      key={`heatmap-${dataKey}`}
      points={points}
      radius={radius}
      opacity={0.7}
      gradient={{
        // Cool → brand → amber → red. startPoints strictly increasing in (0, 1].
        colors: ['#22c55e', palette.brand[400], '#f59e0b', '#ef4444'],
        startPoints: [0.1, 0.4, 0.7, 1.0],
        colorMapSize: 256,
      }}
    />
  );
}
