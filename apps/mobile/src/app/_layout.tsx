import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/global.css';

import { AppErrorBoundary } from '@/components/error-boundary';
import { APP_NAME } from '@/constants';
import { useLiveReportsStore } from '@/features/map-system/store/live-reports.store';
import { usePushRegistration } from '@/features/notifications/hooks/use-push-registration';
import { NotificationsProvider } from '@/features/notifications/providers/notifications-provider';
import { OfflineBanner } from '@/features/offline-sync/components/offline-banner';
import { useNetworkConnectivity } from '@/features/offline-sync/hooks/use-network-connectivity';
import { ToastProvider } from '@/features/toast';
import { useOfflineQueue } from '@/features/upload-report/hooks/use-offline-queue';
import { useOfflineQueueStore } from '@/features/upload-report/store/offline-queue.store';
import { QueryProvider } from '@/providers/query-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { setUnauthorizedHandler } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/**
 * The root layout is intentionally thin — it just composes providers.
 * Hooks that touch any provider's context (TanStack Query, theme, etc.) must
 * live inside <AppShell />, which is rendered as a child of the providers.
 */
export default function RootLayout() {
  const navTheme = DefaultTheme;

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryProvider>
            <ThemeProvider>
              <SocketProvider>
                <ToastProvider>
                  <BottomSheetModalProvider>
                    <NavThemeProvider value={navTheme}>
                      <StatusBar style="dark" />
                      <AppShell />
                    </NavThemeProvider>
                  </BottomSheetModalProvider>
                </ToastProvider>
              </SocketProvider>
            </ThemeProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const hydrateQueue = useOfflineQueueStore((s) => s.hydrate);
  const hydrateLiveReports = useLiveReportsStore((s) => s.hydrate);

  const [bootDone, setBootDone] = useState(false);

  // Network connectivity store mirrors NetInfo into a global Zustand store
  // so banner / sync indicator / queue card can subscribe in one place.
  useNetworkConnectivity();

  // Drain the offline queue whenever the user is signed in.
  // (Uses useQueryClient — must be inside <QueryProvider />.)
  useOfflineQueue(isAuthenticated && bootDone);

  // Register the device's Expo push token once authenticated.
  usePushRegistration();

  useEffect(() => {
    setUnauthorizedHandler(() => logout());
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.all([hydrate(), hydrateQueue(), hydrateLiveReports()]);
      await new Promise((r) => setTimeout(r, 200));
      if (!cancelled) {
        setBootDone(true);
        SplashScreen.hideAsync().catch(() => undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate, hydrateQueue, hydrateLiveReports]);

  if (!bootDone || !isHydrated) {
    return <Splash />;
  }

  return (
    <NotificationsProvider enabled={isAuthenticated}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen
          name="reports/[id]"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(onboarding)"
          options={{ animation: 'fade' }}
        />
      </Stack>
      {/* Persistent offline banner — sits above all routes when offline/unstable */}
      <OfflineBanner />
    </NotificationsProvider>
  );
}

function Splash() {
  const glow = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    breathe.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(glow);
      cancelAnimation(breathe);
    };
  }, [glow, breathe]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.4 }],
    opacity: 0.25 + glow.value * 0.45,
  }));

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.05 }],
  }));

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View className="flex-1 items-center justify-center gap-4">
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: palette.brand[400],
              },
              glowStyle,
            ]}
          />
          <Animated.View entering={FadeIn.duration(450)} style={breatheStyle}>
            <View
              className="h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10"
              style={{
                shadowColor: palette.brand[300],
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
              }}
            >
              <Text className="text-4xl">🌾</Text>
            </View>
          </Animated.View>
        </View>
        <Animated.View entering={FadeIn.delay(150).duration(450)} className="items-center gap-1">
          <Text className="text-xl font-semibold text-white">{APP_NAME}</Text>
          <Text className="text-xs font-medium uppercase tracking-[3px] text-white/55">
            Crop intelligence
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
