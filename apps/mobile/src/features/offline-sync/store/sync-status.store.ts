import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'failed';

interface SyncState {
  phase: SyncPhase;
  /** Number of items currently in the upload queue (mirrored from queue store). */
  queueDepth: number;
  /** ISO timestamp of the last successful sync. */
  lastSyncedAt: string | null;
  /** Optional human-readable error from the most recent failure. */
  lastError: string | null;

  setPhase: (phase: SyncPhase) => void;
  setQueueDepth: (depth: number) => void;
  markSynced: () => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

/**
 * Aggregated sync status — drives `SyncIndicator` and `OfflineBanner`. The
 * queue store remains the source of truth for the queue itself; this store
 * just mirrors a derived view so UI components don't have to subscribe to
 * the entire queue.
 */
export const useSyncStatusStore = create<SyncState>((set) => ({
  phase: 'idle',
  queueDepth: 0,
  lastSyncedAt: null,
  lastError: null,

  setPhase: (phase) => set({ phase }),
  setQueueDepth: (queueDepth) => set({ queueDepth }),
  markSynced: () =>
    set({ phase: 'idle', lastSyncedAt: new Date().toISOString(), lastError: null }),
  setError: (lastError) => set({ phase: 'failed', lastError }),
  reset: () =>
    set({ phase: 'idle', queueDepth: 0, lastSyncedAt: null, lastError: null }),
}));
