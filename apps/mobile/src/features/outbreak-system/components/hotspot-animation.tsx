import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { Severity } from '@/features/upload-report/types';
import { palette } from '@/theme/colors';
import { View } from '@/tw';
import { severityVisuals } from '@/utils/severity';

interface HotspotAnimationProps {
  severity: Severity | null;
  /** Diameter of the inner core in px (default 16). */
  size?: number;
}

/**
 * The dramatic outbreak pulse: 3 staggered concentric rings continuously
 * radiating outward, severity-colored, faster cadence for HIGH. Centerpiece
 * of the realtime map's "alive" feel.
 */
export function HotspotAnimation({ severity, size = 16 }: HotspotAnimationProps) {
  const visuals = severityVisuals(severity);
  const baseDuration =
    (severity ?? '').toString().toUpperCase() === 'HIGH'
      ? 1200
      : (severity ?? '').toString().toUpperCase() === 'MEDIUM'
        ? 1500
        : 1800;

  return (
    <View
      style={{
        width: size * 6,
        height: size * 6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ring color={visuals.rawColor} duration={baseDuration} delay={0} max={size * 6} />
      <Ring color={visuals.rawColor} duration={baseDuration} delay={baseDuration / 3} max={size * 6} />
      <Ring color={visuals.rawColor} duration={baseDuration} delay={(baseDuration * 2) / 3} max={size * 6} />

      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: visuals.rawColor,
          borderWidth: 2,
          borderColor: '#ffffff',
          shadowColor: visuals.rawColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 6,
        }}
      />
    </View>
  );
}

function Ring({
  color,
  duration,
  delay,
  max,
}: {
  color: string;
  duration: number;
  delay: number;
  max: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.out(Easing.ease) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
  }, [progress, duration, delay]);

  const style = useAnimatedStyle(() => ({
    width: max * progress.value,
    height: max * progress.value,
    borderRadius: (max * progress.value) / 2,
    opacity: 0.55 - progress.value * 0.55,
    borderColor: color,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          borderWidth: 2,
        },
        style,
      ]}
    />
  );
}

void palette; // referenced for severity ring tinting in future variants
