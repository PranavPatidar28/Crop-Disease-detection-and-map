import { Bell } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionLabel } from '@/components/ui/section-label';
import { NotificationBadge } from '@/features/notifications/components/notification-badge';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { User } from '@/types/user';

import { useGreeting } from '../hooks/use-greeting';

interface GreetingHeaderProps {
  user: User | null;
  unreadCount?: number;
  onPressAvatar?: () => void;
  onPressBell?: () => void;
}

export function GreetingHeader({
  user,
  unreadCount = 0,
  onPressAvatar,
  onPressBell,
}: GreetingHeaderProps) {
  const greeting = useGreeting();
  const displayName = user?.name ?? 'Farmer';
  const location =
    [user?.district, user?.state].filter(Boolean).join(', ') || 'Set your location';

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <SectionLabel>{greeting}</SectionLabel>
          <Text className="text-2xl font-bold tracking-tight text-text" numberOfLines={1}>
            {displayName}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-sm">📍</Text>
            <Text className="flex-1 text-xs text-text-muted" numberOfLines={1}>
              {location}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open alerts"
            onPress={onPressBell}
            haptic="selection"
            pressedScale={0.92}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Bell size={20} color={palette.brand[700]} strokeWidth={2.2} />
            {unreadCount > 0 ? (
              <View style={{ position: 'absolute', top: -2, right: -2 }}>
                <NotificationBadge count={unreadCount} size="sm" />
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={onPressAvatar}
            haptic="selection"
            pressedScale={0.92}
          >
            <Avatar name={user?.name} fallback="🌾" size="md" />
          </PressableScale>
        </View>
      </View>
    </Animated.View>
  );
}
