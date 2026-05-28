import type { Report, Severity } from '@/features/upload-report/types';

export interface OutbreakZone {
  id: string;
  disease: string;
  latitude: number;
  longitude: number;
  /** Effective radius in meters. */
  radius: number;
  reportCount: number;
  highCount: number;
  severity: Severity;
  affectedCropTypes: string[];
  active: boolean;
  resolvedAt: string | null;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyReportsResponse {
  items: Report[];
  count: number;
  center: { lat: number; lng: number };
  radiusKm: number;
}

export type MapLayerMode = 'markers' | 'heatmap' | 'both';

export type DateWindow = '24h' | '7d' | '30d' | 'all';

export interface MapFilters {
  crops: string[]; // crop names from CROPS catalog
  diseases: string[];
  severities: Severity[]; // empty = all
  window: DateWindow;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
