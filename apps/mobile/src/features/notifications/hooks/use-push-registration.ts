import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/store/auth.store';

import { notificationsApi, type DevicePlatform } from '../api/notifications.api';

const platformFromOS = (): DevicePlatform => {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  return 'WEB';
};

/**
 * Registers the device's Expo push token with the backend after the user is
 * authenticated and they have granted notification permission. Subsequent
 * token rotations are picked up via the addPushTokenListener.
 *
 * Foreground delivery is configured at module load via setNotificationHandler.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Don't show OS notifications while foreground — the in-app banner does it.
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;

    void (async () => {
      try {
        const settings = await Notifications.getPermissionsAsync();
        let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        if (!granted) {
          const req = await Notifications.requestPermissionsAsync({
            ios: { allowAlert: true, allowSound: true, allowBadge: true },
          });
          granted = req.granted;
        }
        if (!granted || cancelled) return;

        // In dev builds without an EAS project this can warn / throw on Android.
        // We swallow and log — push silently disables, in-app banners still work.
        const token = await Notifications.getExpoPushTokenAsync().catch(() => null);
        if (!token?.data || cancelled) return;

        await notificationsApi.registerPushToken(token.data, platformFromOS());

        const sub = Notifications.addPushTokenListener(async (next) => {
          if (next?.data) {
            try {
              await notificationsApi.registerPushToken(next.data, platformFromOS());
            } catch {
              /* ignore */
            }
          }
        });

        return () => sub.remove();
      } catch {
        /* ignore — push isn't critical, in-app + WS still work */
      }
      return undefined;
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
