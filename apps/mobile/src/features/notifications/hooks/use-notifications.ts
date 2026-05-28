import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  notificationsApi,
  type Notification,
  type NotificationType,
} from '../api/notifications.api';
import { useNotificationsStore } from '../store/notifications.store';

const BASE_KEY = ['notifications'] as const;

interface UseNotificationsOptions {
  unreadOnly?: boolean;
  type?: NotificationType;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const setMany = useNotificationsStore((s) => s.setMany);

  const query = useInfiniteQuery({
    queryKey: [...BASE_KEY, 'feed', options],
    queryFn: ({ pageParam }) =>
      notificationsApi.list({
        limit: 30,
        cursor: pageParam as string | undefined,
        unreadOnly: options.unreadOnly,
        type: options.type,
      }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 15_000,
  });

  // Seed the store with the most recent page so badges + cache stay in sync.
  useEffect(() => {
    const first = query.data?.pages[0];
    if (first) {
      void setMany(first.items, first.unreadCount);
    }
  }, [query.data, setMany]);

  return query;
}

export function useUnreadCount(): number {
  const cached = useNotificationsStore((s) => s.unreadCount);
  const setUnread = useNotificationsStore((s) => s.setUnreadCount);

  // Cheap remote refresh — keeps the badge accurate without hammering the feed.
  const query = useQuery({
    queryKey: [...BASE_KEY, 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (query.data?.count != null) setUnread(query.data.count);
  }, [query.data, setUnread]);

  return cached;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const storeMarkRead = useNotificationsStore((s) => s.markRead);
  return useMutation<Notification, Error, string>({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: async (_data, id) => {
      await storeMarkRead(id);
      void qc.invalidateQueries({ queryKey: BASE_KEY });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  const storeMarkAllRead = useNotificationsStore((s) => s.markAllRead);
  return useMutation<{ count: number }, Error, void>({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: async () => {
      await storeMarkAllRead();
      void qc.invalidateQueries({ queryKey: BASE_KEY });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  const storeRemove = useNotificationsStore((s) => s.remove);
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => notificationsApi.remove(id),
    onSuccess: async (_data, id) => {
      await storeRemove(id);
      void qc.invalidateQueries({ queryKey: BASE_KEY });
    },
  });
}
