import { Heatmap } from 'react-native-maps';
import { useMemo } from 'react';

import type { Report } from '@/features/upload-report/types';
import { palette } from '@/theme/colors';

interface HeatmapLayerProps {
  reports: Report[];
}

/**
 * Severity-weighted heatmap. iOS via Apple Maps overlay, Android via Google
 * Maps. Skipped automatically when there are 0 reports (avoids a NaN region).
 */
export function HeatmapLayer({ reports }: HeatmapLayerProps) {
  const points = useMemo(
    () =>
      reports.map((r) => ({
        latitude: r.latitude,
        longitude: r.longitude,
        weight: r.severity === 'HIGH' ? 1 : r.severity === 'MEDIUM' ? 0.6 : 0.3,
      })),
    [reports],
  );

  if (points.length === 0) return null;

  return (
    <Heatmap
      points={points}
      radius={48}
      opacity={0.65}
      gradient={{
        colors: ['#22c55e', palette.brand[400], '#f59e0b', '#ef4444'],
        startPoints: [0.0, 0.4, 0.7, 1.0],
        colorMapSize: 256,
      }}
    />
  );
}
