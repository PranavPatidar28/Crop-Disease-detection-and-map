import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback';
import { PressableScale } from '@/components/ui/pressable-scale';
import {
  type NotificationFilterValue,
  NotificationCard,
  NotificationFilter,
} from '@/features/notifications/components';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks';
import type { Notification, NotificationType } from '@/features/notifications/api/notifications.api';
import { useNotificationsStore } from '@/features/notifications/store/notifications.store';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
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
  const remove = useDeleteNotification();

  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const items: Notification[] =
    query.data?.pages.flatMap((p) => p.items) ?? [];

  const handlePress = (n: Notification) => {
    if (!n.read) {
      markRead.mutate(n.id);
    }
    const data = n.data as Record<string, unknown> | null;
    const outbreakId = data?.outbreakId as string | undefined;
    const reportId = data?.reportId as string | undefined;
    if (reportId) {
      router.push({ pathname: '/reports/[id]', params: { id: reportId } });
    } else if (outbreakId) {
      router.push('/map');
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-5 pb-3 pt-2">
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-3xl font-bold text-text">Alerts</Text>
              <Text className="text-sm text-text-muted">
                Outbreaks and updates from your region
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {unreadCount > 0 ? (
                <View className="rounded-full bg-brand-500/15 px-2.5 py-1">
                  <Text className="text-xs font-semibold text-brand-500">{unreadCount} new</Text>
                </View>
              ) : null}
              {unreadCount > 0 ? (
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                  haptic="selection"
                  pressedScale={0.94}
                >
                  <Text className="text-xs font-semibold text-brand-500">Mark all read</Text>
                </PressableScale>
              ) : null}
            </View>
          </View>

          <View className="mt-3">
            <NotificationFilter value={filter} onChange={setFilter} />
          </View>
        </View>

        <View className="flex-1">
          {query.isPending ? (
            <View className="items-center pt-10">
              <ActivityIndicator color={palette.brand[400]} />
            </View>
          ) : items.length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description={
                filter === 'unread'
                  ? "You're all caught up."
                  : 'Add a plot in your profile to start receiving outbreak alerts near your fields.'
              }
            />
          ) : (
            <FlashList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
              ItemSeparatorComponent={() => <View className="h-2" />}
              onEndReached={() => {
                if (query.hasNextPage && !query.isFetchingNextPage) {
                  void query.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.6}
              refreshControl={
                <RefreshControl
                  refreshing={query.isRefetching}
                  onRefresh={() => query.refetch()}
                  tintColor={theme.primary}
                />
              }
              ListFooterComponent={
                query.isFetchingNextPage ? (
                  <View className="py-4">
                    <ActivityIndicator color={palette.brand[400]} />
                  </View>
                ) : null
              }
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 30).duration(280)}>
                  <Pressable
                    onLongPress={() => remove.mutate(item.id)}
                  >
                    <NotificationCard notification={item} onPress={handlePress} />
                  </Pressable>
                </Animated.View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
