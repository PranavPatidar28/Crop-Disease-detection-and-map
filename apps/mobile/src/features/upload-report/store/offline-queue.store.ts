import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { QueueItem } from '../types';

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
      const items = raw ? (JSON.parse(raw) as QueueItem[]) : [];
      // Reset any items stuck in `uploading` from a previous app session.
      const cleaned = items.map((it) =>
        it.status === 'uploading' ? { ...it, status: 'pending' as const } : it,
      );
      set({ items: cleaned, isHydrated: true });
      if (cleaned.length !== items.length) await persist(cleaned);
    } catch {
      set({ items: [], isHydrated: true });
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
