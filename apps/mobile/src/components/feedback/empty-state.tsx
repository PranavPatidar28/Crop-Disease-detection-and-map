import { useEffect, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Standard empty state. The icon sits inside a softly pulsing ring so the
 * placeholder reads as "ready, just nothing to show yet" rather than "broken".
 */
export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center gap-4 px-6 py-10', className)}>
      <PulsingIconHalo>{icon}</PulsingIconHalo>
      <View className="items-center gap-1">
        <Text className="text-lg font-semibold text-text">{title}</Text>
        {description ? (
          <Text className="text-center text-sm text-text-muted">{description}</Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <View className="mt-2">
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

function PulsingIconHalo({ children }: { children: ReactNode }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.15 }],
    opacity: 0.35 + pulse.value * 0.25,
  }));

  return (
    <View className="items-center justify-center">
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: 'rgba(16, 185, 129, 0.10)',
          },
          haloStyle,
        ]}
      />
      <View className="h-16 w-16 items-center justify-center rounded-full bg-surface">
        {children ?? <View className="h-6 w-6 rounded-full bg-border-strong" />}
      </View>
    </View>
  );
}
