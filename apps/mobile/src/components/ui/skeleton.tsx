import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { View } from '@/tw';
import { cn } from '@/utils/cn';

export interface SkeletonProps {
  className?: string;
  style?: ViewStyle;
  width?: number | string;
  height?: number | string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const radiusClass: Record<NonNullable<SkeletonProps['rounded']>, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-3xl',
  full: 'rounded-full',
};

/**
 * Lightweight shimmer skeleton — reanimated-driven LinearGradient sweep.
 *
 * Width is measured on layout so the sweep travels exactly the container's
 * width regardless of actual size (previous version used a fixed 600px translate
 * that misbehaved on narrow rows and stutter-overlapped on tall cards).
 */
export function Skeleton({ className, style, width, height = 16, rounded = 'md' }: SkeletonProps) {
  const progress = useSharedValue(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const sweep = measuredWidth || 240;
    return {
      transform: [
        {
          translateX: interpolate(progress.value, [0, 1], [-sweep, sweep]),
        },
      ],
    };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && Math.abs(w - measuredWidth) > 1) {
      setMeasuredWidth(w);
    }
  };

  return (
    <View
      onLayout={onLayout}
      className={cn('overflow-hidden bg-border', radiusClass[rounded], className)}
      style={[
        {
          width: width as ViewStyle['width'],
          height: height as ViewStyle['height'],
        },
        style,
      ]}
    >
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(232,228,220,0.6)', 'rgba(250,250,246,0.9)', 'rgba(232,228,220,0.6)', 'transparent']}
          locations={[0, 0.4, 0.5, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
