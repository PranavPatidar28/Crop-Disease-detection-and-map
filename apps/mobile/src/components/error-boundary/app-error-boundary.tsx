import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { logger } from '@/utils/logger';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional override for the fallback. Defaults to the full-screen error UI. */
  fallback?: React.ComponentType<FallbackProps>;
}

/**
 * Top-level error boundary with a branded fallback UI. Wraps the entire app
 * tree so a render error in any screen surfaces a recoverable error state
 * instead of a white screen of death.
 *
 * Logs to our `logger` abstraction so a future Sentry hook-up captures every
 * uncaught render.
 */
export function AppErrorBoundary({ children, fallback }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={fallback ?? DefaultFallback}
      onError={(error, info) => {
        logger.error('[error-boundary]', error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

function DefaultFallback({ error, resetErrorBoundary }: FallbackProps) {
  const isDev = __DEV__;
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <Animated.View entering={FadeIn.duration(400)}>
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-danger/15">
              <AlertTriangle size={36} color="#ef4444" strokeWidth={2.2} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(120).duration(400)} className="items-center gap-2">
            <Text className="text-2xl font-bold text-white">Something went wrong</Text>
            <Text className="text-center text-sm text-white/70">
              We hit an unexpected error. Tap below to try again — your work is saved locally.
            </Text>
            {isDev ? (
              <Text className="mt-3 text-center text-xs text-white/50" numberOfLines={6}>
                {message}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(220).duration(400)}>
            <Pressable
              accessibilityRole="button"
              onPress={resetErrorBoundary}
              style={({ pressed }) => ({
                borderRadius: 16,
                overflow: 'hidden',
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <LinearGradient
                colors={[palette.brand[500], palette.brand[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View className="h-12 flex-row items-center justify-center gap-2 px-6">
                  <RefreshCw size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text className="text-sm font-semibold text-white">Try again</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
