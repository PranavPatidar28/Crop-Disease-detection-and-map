import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SectionHeader } from '@/components/layout/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text, View } from '@/tw';

import type { Alert } from '../types';

import { NotificationPreviewCard } from './cards/notification-preview-card';

interface NearbyAlertsProps {
  alerts?: Alert[];
  loading?: boolean;
}

function LiveDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="flex-row items-center gap-1.5">
      <Animated.View
        style={[
          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
          style,
        ]}
      />
      <Text className="text-[11px] font-semibold uppercase tracking-wider text-success">Live</Text>
    </View>
  );
}

export function NearbyAlerts({ alerts, loading }: NearbyAlertsProps) {
  if (loading || !alerts) {
    return (
      <View className="gap-3">
        <SectionHeader title="Nearby alerts" subtitle="What's happening around you" />
        <Skeleton height={72} rounded="xl" />
        <Skeleton height={72} rounded="xl" />
        <Skeleton height={72} rounded="xl" />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <SectionHeader
        title="Nearby alerts"
        subtitle="What's happening around you"
        trailing={
          <View className="flex-row items-center gap-3">
            <LiveDot />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/notifications')}
            >
              <Text className="text-xs font-semibold text-brand-500">View all</Text>
            </Pressable>
          </View>
        }
      />

      <View className="gap-2">
        {alerts.slice(0, 3).map((alert) => (
          <NotificationPreviewCard key={alert.id} alert={alert} />
        ))}
      </View>
    </View>
  );
}
