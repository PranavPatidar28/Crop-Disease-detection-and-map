import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSocket } from '@/providers/socket-provider';

import type { Notification } from '../api/notifications.api';
import { useNotificationsStore } from '../store/notifications.store';

interface NotificationCreatedPayload {
  notification: Notification;
}
interface NotificationIdPayload {
  id: string;
}

interface UseRealtimeNotificationsOptions {
  /** Called when a new notification arrives — used by the in-app banner. */
  onNotification?: (notification: Notification) => void;
}

/**
 * Subscribes to per-user `notification.*` events. Mounted once near the top
 * of the app tree (the NotificationsProvider).
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}): void {
  const { socket } = useSocket();
  const upsert = useNotificationsStore((s) => s.upsert);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const remove = useNotificationsStore((s) => s.remove);
  const qc = useQueryClient();
  // Depend on the stable callback, not the `options` wrapper object. The
  // provider passes a fresh `{ onNotification }` literal each render, so keying
  // the effect on `options` re-subscribed all four listeners on every banner
  // push/dismiss, churning subscriptions and opening windows where events miss.
  const onNotification = options.onNotification;

  useEffect(() => {
    if (!socket) return undefined;

    const onCreated = (payload: NotificationCreatedPayload) => {
      if (!payload?.notification) return;
      void upsert(payload.notification);
      onNotification?.(payload.notification);
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    };
    const onRead = (payload: NotificationIdPayload) => {
      if (payload?.id) void markRead(payload.id);
    };
    const onReadAll = () => {
      void markAllRead();
    };
    const onDeleted = (payload: NotificationIdPayload) => {
      if (payload?.id) void remove(payload.id);
    };

    socket.on('notification.created', onCreated);
    socket.on('notification.read', onRead);
    socket.on('notification.read-all', onReadAll);
    socket.on('notification.deleted', onDeleted);

    return () => {
      socket.off('notification.created', onCreated);
      socket.off('notification.read', onRead);
      socket.off('notification.read-all', onReadAll);
      socket.off('notification.deleted', onDeleted);
    };
  }, [socket, upsert, markRead, markAllRead, remove, qc, onNotification]);
}
