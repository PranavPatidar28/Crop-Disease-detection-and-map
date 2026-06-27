import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Notification } from '../api/notifications.api';

const STORAGE_KEY = 'notifications.cache.v1';
const CAP = 200;

interface NotificationsState {
  byId: Record<string, Notification>;
  unreadCount: number;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setMany: (items: Notification[], unreadCount: number) => Promise<void>;
  upsert: (item: Notification) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  setUnreadCount: (count: number) => void;
}

interface PersistedShape {
  byId: Record<string, Notification>;
  unreadCount: number;
}

function trim(byId: Record<string, Notification>): Record<string, Notification> {
  const ids = Object.keys(byId);
  if (ids.length <= CAP) return byId;
  const sorted = ids
    .map((id) => byId[id]!)
    // ⚡ Bolt: Use direct string comparison for ISO 8601 timestamps
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const next: Record<string, Notification> = {};
  for (const n of sorted.slice(0, CAP)) next[n.id] = n;
  return next;
}

async function persist(state: PersistedShape): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  byId: {},
  unreadCount: 0,
  isHydrated: false,

  async hydrate() {
    if (get().isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedShape;
        set({
          byId: parsed.byId ?? {},
          unreadCount: parsed.unreadCount ?? 0,
          isHydrated: true,
        });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ isHydrated: true });
  },

  async setMany(items, unreadCount) {
    const byId: Record<string, Notification> = {};
    for (const n of items) byId[n.id] = n;
    const trimmed = trim(byId);
    set({ byId: trimmed, unreadCount });
    await persist({ byId: trimmed, unreadCount });
  },

  async upsert(item) {
    const isNewUnread = !get().byId[item.id] && !item.read;
    const next = trim({ ...get().byId, [item.id]: item });
    const unread = isNewUnread ? get().unreadCount + 1 : get().unreadCount;
    set({ byId: next, unreadCount: unread });
    await persist({ byId: next, unreadCount: unread });
  },

  async markRead(id) {
    const item = get().byId[id];
    if (!item || item.read) return;
    const next = { ...get().byId, [id]: { ...item, read: true, readAt: new Date().toISOString() } };
    const unread = Math.max(0, get().unreadCount - 1);
    set({ byId: next, unreadCount: unread });
    await persist({ byId: next, unreadCount: unread });
  },

  async markAllRead() {
    const next: Record<string, Notification> = {};
    for (const [id, n] of Object.entries(get().byId)) {
      next[id] = n.read ? n : { ...n, read: true, readAt: new Date().toISOString() };
    }
    set({ byId: next, unreadCount: 0 });
    await persist({ byId: next, unreadCount: 0 });
  },

  async remove(id) {
    const removed = get().byId[id];
    const next = { ...get().byId };
    delete next[id];
    const unread = removed && !removed.read ? Math.max(0, get().unreadCount - 1) : get().unreadCount;
    set({ byId: next, unreadCount: unread });
    await persist({ byId: next, unreadCount: unread });
  },

  setUnreadCount(count) {
    set({ unreadCount: count });
  },
}));
