import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { QueueItem } from '../types';
import { deleteLocalFile } from '../utils/file-storage';

const STORAGE_KEY = 'upload.queue.v1';

interface OfflineQueueState {
  items: QueueItem[];
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  enqueue: (item: QueueItem) => Promise<void>;
  remove: (id: string) => Promise<void>;
  update: (id: string, patch: Partial<QueueItem>) => Promise<void>;
  clearFailed: () => Promise<void>;
  /** Resets cooldown + failed status on every queue item so the next drainer
   * pass picks them up immediately. Used by the manual "Retry now" button. */
  retryAll: () => Promise<void>;
}

async function persist(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  items: [],
  isHydrated: false,

  async hydrate() {
    if (get().isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as QueueItem[]) : [];
      // Reset any items stuck in `uploading` from a previous app session.
      const cleaned = stored.map((it) =>
        it.status === 'uploading' ? { ...it, status: 'pending' as const } : it,
      );
      // An enqueue() can land during the await above. Merge those in-memory
      // items (by id) rather than overwriting them, or we'd silently drop a
      // report the user just queued while offline at boot.
      const pending = get().items;
      const byId = new Map<string, QueueItem>();
      for (const it of cleaned) byId.set(it.id, it);
      for (const it of pending) byId.set(it.id, it);
      const merged = Array.from(byId.values());
      set({ items: merged, isHydrated: true });
      if (merged.length !== stored.length) await persist(merged);
    } catch {
      set({ items: get().items, isHydrated: true });
    }
  },

  async enqueue(item) {
    const next = [...get().items, item];
    set({ items: next });
    await persist(next);
  },

  async remove(id) {
    const next = get().items.filter((it) => it.id !== id);
    set({ items: next });
    await persist(next);
  },

  async update(id, patch) {
    const next = get().items.map((it) => (it.id === id ? { ...it, ...patch } : it));
    set({ items: next });
    await persist(next);
  },

  async clearFailed() {
    const failed = get().items.filter((it) => it.status === 'failed');
    // Free the persistent local copies of the items we're dropping.
    for (const it of failed) deleteLocalFile(it.draft.localImageUri);
    const next = get().items.filter((it) => it.status !== 'failed');
    set({ items: next });
    await persist(next);
  },

  async retryAll() {
    const next = get().items.map((it) => ({
      ...it,
      status: 'pending' as const,
      attempts: 0,
      nextAttemptAt: undefined,
      lastError: undefined,
    }));
    set({ items: next });
    await persist(next);
  },
}));
