import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';

/**
 * Soft Sage marker fills. Tuned for a light map background — slightly more
 * saturated than the global status tokens so dots stay readable.
 */
const SEVERITY_FILL: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#047857',
  MEDIUM: '#d97706',
  HIGH: '#dc2626',
};

function severityFill(severity: Severity | null | undefined): string {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  if (norm === 'HIGH') return SEVERITY_FILL.HIGH;
  if (norm === 'MEDIUM') return SEVERITY_FILL.MEDIUM;
  return SEVERITY_FILL.LOW;
}

interface MapMarkerProps {
  severity: Severity | null;
  cropEmoji?: string;
  /** Pulse only on HIGH severity for performance + visual hierarchy. */
  enablePulse?: boolean;
}

/**
 * Custom severity-colored map marker. Designed to render via
 * `<Marker>`'s child renderer with `tracksViewChanges={false}` after first
 * frame so we don't rerender on every region change.
 */
export function MapMarker({ severity, cropEmoji, enablePulse }: MapMarkerProps) {
  const fill = severityFill(severity);
  const pulse = useSharedValue(0);
  const isHigh = (severity ?? '').toString().toUpperCase() === 'HIGH';
  const shouldPulse = enablePulse && isHigh;

  useEffect(() => {
    if (!shouldPulse) return undefined;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, shouldPulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 1.4 }],
    opacity: 0.55 - pulse.value * 0.55,
  }));

  return (
    <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      {shouldPulse ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: fill,
              opacity: 0.3,
            },
            ringStyle,
          ]}
        />
      ) : null}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: '#ffffff',
          shadowColor: fill,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Text style={{ fontSize: 16 }}>{cropEmoji ?? '🌿'}</Text>
      </View>
    </View>
  );
}

interface MapClusterProps {
  count: number;
  highCount: number;
  mediumCount: number;
}

/**
 * Cluster bubble — gradient background based on severity mix.
 * - Brand gradient when no HIGH severity reports are inside.
 * - Danger gradient (orange→red) when any HIGH severity is inside.
 */
export function MapCluster({ count, highCount }: MapClusterProps) {
  const dangerous = highCount > 0;
  const gradientColors: [string, string] = dangerous
    ? ['#f97316', '#dc2626']
    : [palette.brand[500], palette.brand[600]];
  const shadowTint = dangerous ? '#dc2626' : palette.brand[600];

  const size = count >= 50 ? 56 : count >= 10 ? 48 : 40;
  const fontSize = count >= 100 ? 13 : 14;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
        overflow: 'hidden',
        shadowColor: shadowTint,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <Text style={{ fontSize, fontWeight: '700', color: '#ffffff' }}>
        {count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}
      </Text>
    </View>
  );
}
