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
import { severityVisuals } from '@/utils/severity';

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
  const visuals = severityVisuals(severity);
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
              backgroundColor: visuals.rawColor,
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
          backgroundColor: visuals.rawColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2.5,
          borderColor: '#ffffff',
          shadowColor: visuals.rawColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
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
 * Cluster bubble — count + dominant-severity color.
 */
export function MapCluster({ count, highCount, mediumCount }: MapClusterProps) {
  const color =
    highCount > 0
      ? '#ef4444'
      : mediumCount > 0
        ? '#f59e0b'
        : palette.brand[500];

  const size = count >= 50 ? 56 : count >= 10 ? 48 : 40;
  const fontSize = count >= 100 ? 13 : 14;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Text style={{ fontSize, fontWeight: '700', color: '#ffffff' }}>
        {count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}
      </Text>
    </View>
  );
}
