import * as Haptics from 'expo-haptics';
import { type ReactNode, useCallback, useEffect } from 'react';

import type { Notification } from '../api/notifications.api';
import { InAppBannerStack, useBannerStack } from '../components/in-app-banner';
import { useRealtimeNotifications } from '../hooks/use-realtime-notifications';
import { useNotificationsStore } from '../store/notifications.store';

interface NotificationsProviderProps {
  children: ReactNode;
  /** When false, suppresses the banner UI (e.g. on auth screens). */
  enabled?: boolean;
}

/**
 * Top-level provider that:
 *   - hydrates the notifications store from AsyncStorage on boot
 *   - subscribes to socket events
 *   - renders the in-app banner stack on top of the app
 *
 * Should be mounted inside the auth gate (so socket exists) but above
 * `Stack` so banners render above all routes.
 */
export function NotificationsProvider({ children, enabled = true }: NotificationsProviderProps) {
  const hydrate = useNotificationsStore((s) => s.hydrate);
  const isHydrated = useNotificationsStore((s) => s.isHydrated);
  const { banners, push, dismiss } = useBannerStack();

  useEffect(() => {
    if (!isHydrated) void hydrate();
  }, [hydrate, isHydrated]);

  const onNotification = useCallback(
    (n: Notification) => {
      if (!enabled) return;
      Haptics.selectionAsync().catch(() => undefined);
      push(n);
    },
    [enabled, push],
  );

  useRealtimeNotifications({ onNotification });

  return (
    <>
      {children}
      {enabled ? <InAppBannerStack banners={banners} onDismiss={dismiss} /> : null}
    </>
  );
}
