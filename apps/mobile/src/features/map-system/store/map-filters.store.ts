import { create } from 'zustand';

import type { DateWindow, MapFilters, MapLayerMode } from '../types';

interface MapFiltersState extends MapFilters {
  layerMode: MapLayerMode;
  /** When true, also render outbreaks marked `active=false`. */
  showResolved: boolean;

  setCrops: (crops: string[]) => void;
  setDiseases: (diseases: string[]) => void;
  setSeverities: (sev: MapFilters['severities']) => void;
  setWindow: (w: DateWindow) => void;
  setLayerMode: (mode: MapLayerMode) => void;
  setShowResolved: (value: boolean) => void;
  reset: () => void;

  /** True when any filter is applied (used to badge the filter button). */
  hasActiveFilters: () => boolean;
}

const DEFAULT: MapFilters = {
  crops: [],
  diseases: [],
  severities: [],
  window: '7d',
};

export const useMapFiltersStore = create<MapFiltersState>((set, get) => ({
  ...DEFAULT,
  layerMode: 'markers',
  showResolved: false,

  setCrops: (crops) => set({ crops }),
  setDiseases: (diseases) => set({ diseases }),
  setSeverities: (severities) => set({ severities }),
  setWindow: (window) => set({ window }),
  setLayerMode: (layerMode) => set({ layerMode }),
  setShowResolved: (showResolved) => set({ showResolved }),
  reset: () => set({ ...DEFAULT, showResolved: false }),

  hasActiveFilters: () => {
    const s = get();
    return (
      s.crops.length > 0 ||
      s.diseases.length > 0 ||
      s.severities.length > 0 ||
      s.window !== DEFAULT.window ||
      s.showResolved
    );
  },
}));

/** Convert a DateWindow to an ISO string ('all' returns undefined). */
export function windowToSinceIso(window: DateWindow): string | undefined {
  if (window === 'all') return undefined;
  const hours = window === '24h' ? 24 : window === '7d' ? 7 * 24 : 30 * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}
