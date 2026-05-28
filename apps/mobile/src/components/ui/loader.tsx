import { useEffect } from 'react';
import { type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';
import { cn } from '@/utils/cn';

export interface LoaderProps {
  label?: string;
  size?: number;
  fullscreen?: boolean;
  className?: string;
  style?: ViewStyle;
}

/**
 * Brand-tinted spinner. Two concentric arcs rotating at different speeds.
 * Replaces the prior ActivityIndicator-based loader for visual continuity
 * with the rest of the Soft Sage system.
 */
export function Loader({ label, size = 48, fullscreen, className, style }: LoaderProps) {
  const angle = useSharedValue(0);

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(angle);
  }, [angle]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value * 360}deg` }],
  }));

  const stroke = Math.max(3, Math.round(size * 0.1));

  return (
    <View
      className={cn(
        'items-center justify-center gap-3',
        fullscreen && 'absolute inset-0 bg-bg/80',
        !fullscreen && 'p-4',
        className,
      )}
      style={style}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: stroke,
              borderColor: palette.brand[100],
              borderTopColor: palette.brand[500],
              borderRightColor: palette.brand[600],
            },
            ringStyle,
          ]}
        />
      </View>
      {label ? <Text className="text-xs font-medium text-text-muted">{label}</Text> : null}
    </View>
  );
}
