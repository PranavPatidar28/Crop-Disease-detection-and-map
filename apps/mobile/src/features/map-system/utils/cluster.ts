import Supercluster from 'supercluster';

import type { Report } from '@/features/upload-report/types';

import type { MapRegion } from '../types';

interface ReportPointProps {
  reportId: string;
  severity: Report['severity'];
  disease: string | null;
  cropType: string;
  [key: string]: unknown;
}

interface ClusterAccumProps {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  [key: string]: unknown;
}

export type ClusterFeatureProps = ClusterAccumProps & {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string | number;
};

export type ReportFeatureProps = ReportPointProps & { cluster?: false };

export type AnyFeature =
  | (Supercluster.PointFeature<ReportPointProps> & { properties: ReportFeatureProps })
  | (Supercluster.PointFeature<ClusterAccumProps> & { properties: ClusterFeatureProps });

/** Build a Supercluster index from Report rows. */
export function buildClusterIndex(
  reports: Report[],
): Supercluster<ReportPointProps, ClusterAccumProps> {
  const sc = new Supercluster<ReportPointProps, ClusterAccumProps>({
    radius: 60,
    maxZoom: 16,
    minZoom: 0,
    map: (props) => ({
      highCount: props.severity === 'HIGH' ? 1 : 0,
      mediumCount: props.severity === 'MEDIUM' ? 1 : 0,
      lowCount: props.severity === 'LOW' ? 1 : 0,
    }),
    reduce: (acc, props) => {
      acc.highCount += props.highCount;
      acc.mediumCount += props.mediumCount;
      acc.lowCount += props.lowCount;
    },
  });

  const points: Supercluster.PointFeature<ReportPointProps>[] = reports.map((r) => ({
    type: 'Feature',
    properties: {
      reportId: r.id,
      severity: r.severity,
      disease: r.disease,
      cropType: r.cropType,
    },
    geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
  }));

  sc.load(points);
  return sc;
}

/** Compute the supercluster zoom level for a MapRegion (0-20). */
export function regionToZoom(region: MapRegion): number {
  return Math.max(0, Math.min(20, Math.round(Math.log2(360 / region.longitudeDelta))));
}

export function getClusters(
  index: Supercluster<ReportPointProps, ClusterAccumProps>,
  region: MapRegion,
): AnyFeature[] {
  const lngHalf = region.longitudeDelta / 2;
  const latHalf = region.latitudeDelta / 2;
  const bbox: [number, number, number, number] = [
    region.longitude - lngHalf,
    region.latitude - latHalf,
    region.longitude + lngHalf,
    region.latitude + latHalf,
  ];
  const zoom = regionToZoom(region);
  return index.getClusters(bbox, zoom) as AnyFeature[];
}
