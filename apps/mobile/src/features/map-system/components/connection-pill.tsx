import { GlassView } from 'expo-glass-effect';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

interface ConnectionPillProps {
  isConnected: boolean;
  reportCount: number;
}

export function ConnectionPill({ isConnected, reportCount }: ConnectionPillProps) {
  const theme = useTheme();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (!isConnected) {
      pulse.value = 1;
      return undefined;
    }
    pulse.value = withRepeat(
      withTiming(0.4, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [isConnected, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const color = isConnected ? '#22c55e' : '#f59e0b';

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : `${theme.surfaceElevated}E6`}
      style={{ borderRadius: 999, overflow: 'hidden' }}
    >
      <View className="flex-row items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
        <Animated.View
          style={[
            { width: 8, height: 8, borderRadius: 4, backgroundColor: color },
            dotStyle,
          ]}
        />
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-text">
          {isConnected ? 'Live' : 'Offline'}
        </Text>
        <View className="h-3 w-px bg-white/15" />
        <Text className="text-[11px] font-medium text-text-muted">
          {reportCount} {reportCount === 1 ? 'report' : 'reports'}
        </Text>
        <View className="h-1 w-1 rounded-full" style={{ backgroundColor: palette.brand[400] }} />
      </View>
    </GlassView>
  );
}
