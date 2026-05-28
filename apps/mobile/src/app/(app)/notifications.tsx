import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback';
import { Loader } from '@/components/ui/loader';
import { PressableScale } from '@/components/ui/pressable-scale';
import {
  DayLabel,
  type NotificationFilterValue,
  NotificationCard,
  NotificationFilter,
} from '@/features/notifications/components';
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks';
import type { Notification, NotificationType } from '@/features/notifications/api/notifications.api';
import { useNotificationsStore } from '@/features/notifications/store/notifications.store';
import { groupByDay } from '@/features/notifications/utils/group-by-day';
import { useTheme } from '@/hooks/use-theme';
import { Text, View } from '@/tw';

export default function NotificationsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<NotificationFilterValue>('all');

  const { unreadOnly, type } = useMemo<{
    unreadOnly?: boolean;
    type?: NotificationType;
  }>(() => {
    if (filter === 'all') return {};
    if (filter === 'unread') return { unreadOnly: true };
    return { type: filter };
  }, [filter]);

  const query = useNotifications({ unreadOnly, type });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const items = useMemo<Notification[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const groups = useMemo(() => groupByDay(items), [items]);

  const handlePress = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    const data = n.data as Record<string, unknown> | null;
    const reportId = data?.reportId as string | undefined;
    const outbreakId = data?.outbreakId as string | undefined;
    if (reportId) {
      router.push({ pathname: '/reports/[id]', params: { id: reportId } });
    } else if (outbreakId) {
      router.push('/map');
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-4 pt-2">
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <Text className="text-3xl font-extrabold tracking-tight text-text">Alerts</Text>
              <Text className="text-sm text-text-muted">
                Outbreaks and updates from your region
              </Text>
            </View>
            {unreadCount > 0 ? (
              <PressableScale
                accessibilityRole="button"
                onPress={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                haptic="selection"
                pressedScale={0.94}
              >
                <Text className="text-xs font-bold text-brand-700">Mark all read</Text>
              </PressableScale>
            ) : null}
          </View>
          <View className="mt-3">
            <NotificationFilter value={filter} onChange={setFilter} />
          </View>
        </View>

        {query.isPending ? (
          <View className="flex-1 items-center justify-center">
            <Loader size={40} />
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              emoji="🌾"
              title="All clear in your area"
              description="We'll alert you when nearby outbreaks need attention."
              actionLabel="Adjust alert radius"
              onAction={() => router.push('/profile')}
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => query.refetch()}
                tintColor={theme.primary}
              />
            }
            onScroll={(e) => {
              const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
              if (
                layoutMeasurement.height + contentOffset.y >= contentSize.height - 200 &&
                query.hasNextPage &&
                !query.isFetchingNextPage
              ) {
                void query.fetchNextPage();
              }
            }}
            scrollEventThrottle={200}
          >
            {groups.map((group, gi) => (
              <View key={group.bucket}>
                <DayLabel>{group.label}</DayLabel>
                <View className="gap-2">
                  {group.items.map((item, i) => (
                    <Animated.View
                      key={item.id}
                      entering={FadeInDown.delay((gi * 100 + i) * 30).duration(260)}
                    >
                      <NotificationCard notification={item} onPress={handlePress} />
                    </Animated.View>
                  ))}
                </View>
              </View>
            ))}
            {query.isFetchingNextPage ? <Loader size={32} /> : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
