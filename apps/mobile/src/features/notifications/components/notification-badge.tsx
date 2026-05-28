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
import { Text } from '@/tw';

interface NotificationBadgeProps {
  count: number;
  /** Tab bar uses a smaller pill; standalone uses a larger one. */
  size?: 'sm' | 'md';
}

export function NotificationBadge({ count, size = 'sm' }: NotificationBadgeProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      pulse.value = withRepeat(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
    return () => cancelAnimation(pulse);
  }, [count, pulse]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (count <= 0) return null;

  const display = count > 99 ? '99+' : String(count);
  const sizeStyle =
    size === 'sm'
      ? { minWidth: 16, height: 16, paddingHorizontal: 4 }
      : { minWidth: 22, height: 22, paddingHorizontal: 6 };

  return (
    <Animated.View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ef4444',
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: palette.brand[900],
          ...sizeStyle,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: '#ffffff',
          fontSize: size === 'sm' ? 10 : 12,
          fontWeight: '700',
        }}
      >
        {display}
      </Text>
    </Animated.View>
  );
}
