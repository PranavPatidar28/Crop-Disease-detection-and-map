// app/(app)/reports.tsx
import { router } from 'expo-router';
import { Leaf, SearchX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';
import { DayLabel } from '@/features/notifications/components';
import { ReportFilterBar } from '@/features/disease-analysis/components/report-filter-bar';
import { ReportHistoryCard } from '@/features/disease-analysis/components/report-history-card';
import { useMyReports } from '@/features/disease-analysis/hooks/use-my-reports';
import {
  DEFAULT_REPORT_FILTER,
  filterReports,
  type ReportFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { groupReportsByDay } from '@/features/disease-analysis/utils/group-reports-by-day';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

const NEAR_BOTTOM_PX = 240;

/**
 * "Reports" — the full history of the signed-in user's reports, now a primary
 * tab. Client-side search + severity/status filters over loaded pages, grouped
 * by day. Infinite-scrolls, pull-to-refresh, explicit loading/empty/error.
 */
export default function ReportsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);
  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyReports();

  const reports = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const filtered = useMemo(() => filterReports(reports, filter), [reports, filter]);
  const groups = useMemo(() => groupReportsByDay(filtered), [filtered]);
  const highSeverityCount = useMemo(
    () => reports.filter((r) => r.severity === 'HIGH').length,
    [reports],
  );
  const isFiltering =
    filter.search.trim().length > 0 || filter.severity !== 'all' || filter.status !== 'all';

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="gap-3 px-4 pb-2 pt-2">
          <View>
            <Text className="text-3xl font-extrabold tracking-tight text-text">Reports</Text>
            <Text className="text-sm text-text-muted">
              {reports.length > 0
                ? `${reports.length}${hasNextPage ? '+' : ''} submitted · ${highSeverityCount} high severity`
                : 'Your crop scans show up here'}
            </Text>
          </View>
          {reports.length > 0 ? <ReportFilterBar value={filter} onChange={setFilter} /> : null}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const distanceFromBottom =
              contentSize.height - (contentOffset.y + layoutMeasurement.height);
            if (distanceFromBottom < NEAR_BOTTOM_PX && hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          scrollEventThrottle={120}
        >
          {isPending ? (
            <View className="gap-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={80} rounded="xl" />
              ))}
            </View>
          ) : isError ? (
            <View className="items-center gap-3 py-16">
              <Text className="text-base font-bold text-text">Couldn&apos;t load your reports</Text>
              <Text className="max-w-[260px] text-center text-sm text-text-muted">
                Check your connection and try again.
              </Text>
              <Button label="Retry" variant="ghost" onPress={() => refetch()} fullWidth={false} />
            </View>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<Leaf size={28} color={palette.brand[600]} strokeWidth={2} />}
              title="No reports yet"
              description="Scan your first crop to start tracking diseases. Your reports show up here."
              actionLabel="Scan a crop"
              onAction={() => router.push('/report')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX size={28} color={palette.brand[600]} strokeWidth={2} />}
              title="No matching reports"
              description="No reports match your current filters. Try clearing them."
              actionLabel="Clear filters"
              onAction={() => setFilter(DEFAULT_REPORT_FILTER)}
            />
          ) : (
            <>
              {groups.map((group, gi) => (
                <View key={group.bucket}>
                  <DayLabel>{group.label}</DayLabel>
                  <View className="gap-2.5">
                    {group.items.map((report, i) => (
                      <Animated.View
                        key={report.id}
                        entering={FadeInDown.delay(Math.min(gi * 60 + i * 40, 360)).duration(360)}
                      >
                        <ReportHistoryCard report={report} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
              ))}
              {!isFiltering && isFetchingNextPage ? (
                <View className="py-4">
                  <Loader size={28} />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
