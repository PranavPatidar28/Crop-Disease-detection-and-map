import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback';
import { BackButton } from '@/components/ui/back-button';
import { Loader } from '@/components/ui/loader';
import { TextButton } from '@/components/ui/text-button';
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
import { useTranslation } from '@/i18n';
import { usePreferencesStore } from '@/store/preferences.store';
import { Text, View } from '@/tw';

export default function NotificationsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
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
  const alertRadiusKm = usePreferencesStore((s) => s.alertRadiusKm);

  const items = useMemo<Notification[]>(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const groups = useMemo(() => groupByDay(items), [items]);

  // ⚡ Bolt: Wrapped in useCallback to prevent recreating the function on every render,
  // which would break the React.memo optimization on NotificationCard
  const handlePress = useCallback((n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    const data = n.data as Record<string, unknown> | null;
    const reportId = data?.reportId as string | undefined;
    const outbreakId = data?.outbreakId as string | undefined;
    if (reportId) {
      router.push({ pathname: '/reports/[id]', params: { id: reportId } });
    } else if (outbreakId) {
      router.push('/map');
    }
  }, [markRead]);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-4 pt-2">
          <View className="mb-2 flex-row items-center gap-3">
            <BackButton onPress={() => router.back()} />
          </View>
          <View className="flex-row items-end justify-between gap-3">
            <View className="flex-1">
              <Text className="text-3xl font-extrabold tracking-tight text-text">{t('notifications.title')}</Text>
              <Text className="text-sm text-text-muted">
                {t('notifications.subtitle')}
              </Text>
            </View>
            {unreadCount > 0 ? (
              <TextButton
                label={t('notifications.markAllRead')}
                size="sm"
                disabled={markAllRead.isPending}
                onPress={() => markAllRead.mutate()}
              />
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
        ) : query.isError ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              emoji="📡"
              title={t('notifications.errorTitle')}
              description={t('notifications.errorDesc')}
              actionLabel={t('common.retry')}
              onAction={() => query.refetch()}
            />
          </View>
        ) : items.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              emoji="🌾"
              title={t('notifications.allClearTitle')}
              description={t('notifications.allClearDesc', { km: alertRadiusKm })}
              actionLabel={t('notifications.adjustRadius')}
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
