import { create } from 'zustand';

import type { Report } from '@/features/upload-report/types';

import { CACHE_KEYS, persistentStorage } from '@/features/offline-sync/utils/persistent-storage';

import type { OutbreakZone } from '../types';

interface LiveReportsState {
  byId: Record<string, Report>;
  outbreakById: Record<string, OutbreakZone>;
  /** Cap on in-memory reports — trims oldest by createdAt when exceeded. */
  cap: number;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setMany: (reports: Report[]) => void;
  upsertReport: (report: Report) => void;
  upsertOutbreak: (zone: OutbreakZone) => void;
  setOutbreaks: (zones: OutbreakZone[]) => void;
  removeOutbreak: (id: string) => void;
  clear: () => Promise<void>;
}

const DEFAULT_CAP = 1000;

interface PersistedShape {
  byId: Record<string, Report>;
  outbreakById: Record<string, OutbreakZone>;
}

function trimToCap(byId: Record<string, Report>, cap: number): Record<string, Report> {
  const ids = Object.keys(byId);
  if (ids.length <= cap) return byId;

  // ⚡ Bolt: Fast string comparison on ISO dates avoids expensive Date instantiations in tight loops
  const sorted = ids
    .map((id) => byId[id]!)
    .sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0));

  const kept = sorted.slice(0, cap);
  const next: Record<string, Report> = {};
  for (const r of kept) next[r.id] = r;
  return next;
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: PersistedShape): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistentStorage.save(CACHE_KEYS.liveReports, state);
  }, 500);
}

export const useLiveReportsStore = create<LiveReportsState>((set, get) => ({
  byId: {},
  outbreakById: {},
  cap: DEFAULT_CAP,
  isHydrated: false,

  async hydrate() {
    if (get().isHydrated) return;
    const persisted = await persistentStorage.load<PersistedShape>(CACHE_KEYS.liveReports);
    if (persisted) {
      set({
        byId: persisted.byId ?? {},
        outbreakById: persisted.outbreakById ?? {},
        isHydrated: true,
      });
    } else {
      set({ isHydrated: true });
    }
  },

  setMany(reports) {
    // Merge into the existing map rather than replacing it. A bare replace would
    // wipe reports delivered via `report.created` socket events (and any outside
    // the current radius/filter) on every 30s poll or region change, making live
    // markers flicker out. The cap trims the oldest, so the map stays bounded.
    const merged = { ...get().byId };
    for (const r of reports) merged[r.id] = r;
    const trimmed = trimToCap(merged, get().cap);
    set({ byId: trimmed });
    schedulePersist({ byId: trimmed, outbreakById: get().outbreakById });
  },

  upsertReport(report) {
    const next = trimToCap({ ...get().byId, [report.id]: report }, get().cap);
    set({ byId: next });
    schedulePersist({ byId: next, outbreakById: get().outbreakById });
  },

  upsertOutbreak(zone) {
    const next = { ...get().outbreakById, [zone.id]: zone };
    set({ outbreakById: next });
    schedulePersist({ byId: get().byId, outbreakById: next });
  },

  setOutbreaks(zones) {
    // Merge (see setMany) so socket-driven outbreak.created/updated zones aren't
    // discarded by the periodic /outbreaks seed fetch.
    const merged = { ...get().outbreakById };
    for (const z of zones) merged[z.id] = z;
    set({ outbreakById: merged });
    schedulePersist({ byId: get().byId, outbreakById: merged });
  },

  removeOutbreak(id) {
    const next = { ...get().outbreakById };
    delete next[id];
    set({ outbreakById: next });
    schedulePersist({ byId: get().byId, outbreakById: next });
  },

  async clear() {
    // Cancel any pending debounced persist so it can't resurrect cleared data.
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = null;
    }
    set({ byId: {}, outbreakById: {} });
    await persistentStorage.remove(CACHE_KEYS.liveReports);
  },
}));
