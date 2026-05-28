import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';
import { severityVisuals } from '@/utils/severity';
import { cn } from '@/utils/cn';

interface SeverityBadgeProps {
  severity: Severity | null;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const visuals = severityVisuals(severity);
  const isHigh = (severity ?? '').toString().toUpperCase() === 'HIGH';

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isHigh) return undefined;
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [isHigh, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 rounded-full',
        visuals.bgClass,
        size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1',
      )}
    >
      <Animated.View
        style={[
          {
            width: size === 'sm' ? 6 : 7,
            height: size === 'sm' ? 6 : 7,
            borderRadius: 4,
            backgroundColor: visuals.rawColor,
          },
          dotStyle,
        ]}
      />
      <Text
        className={cn(
          'font-semibold uppercase tracking-wider',
          visuals.textClass,
          size === 'sm' ? 'text-[10px]' : 'text-[11px]',
        )}
      >
        {visuals.label} severity
      </Text>
    </View>
  );
}
