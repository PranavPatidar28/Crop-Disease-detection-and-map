import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
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
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <Animated.View entering={FadeIn.duration(400)}>
            <View className="h-20 w-20 items-center justify-center rounded-3xl border border-danger/30 bg-danger-tint">
              <AlertTriangle size={36} color={palette.status.danger} strokeWidth={2.2} />
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(120).duration(400)} className="items-center gap-2">
            <Text className="text-2xl font-bold text-text">Something went wrong</Text>
            <Text className="text-center text-sm text-text-muted">
              We hit an unexpected error. Tap below to try again — your work is saved locally.
            </Text>
            {isDev ? (
              <Text className="mt-3 text-center text-xs text-text-faint" numberOfLines={6}>
                {message}
              </Text>
            ) : null}
          </Animated.View>

          <Animated.View entering={FadeIn.delay(220).duration(400)}>
            <Button
              label="Try again"
              variant="gradient"
              size="md"
              fullWidth={false}
              leftSlot={<RefreshCw size={16} color="#ffffff" strokeWidth={2.4} />}
              onPress={resetErrorBoundary}
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}
