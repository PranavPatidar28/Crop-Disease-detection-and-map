import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowUpDown, ChevronRight } from 'lucide-react-native';
import { forwardRef, useMemo, useState } from 'react';
import { Pressable } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { Report } from '@/features/upload-report/types';
import { timeAgo } from '@/utils/severity';

interface Props {
  reports: Report[];
}

const SEVERITY_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

const SEVERITY_RANK: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

type SortMode = 'newest' | 'severity';

/**
 * On-demand modal listing the reports currently visible on the map. Opened via
 * the list button in the map controls (`ref.current?.present()`); dismissed by
 * swiping down or tapping the backdrop. Snap points: 60%, 92%.
 */
export const ReportsInViewSheet = forwardRef<BottomSheetModal, Props>(function ReportsInViewSheet(
  { reports },
  ref,
) {
  const snapPoints = useMemo(() => ['60%', '92%'], []);
  const [sort, setSort] = useState<SortMode>('newest');

  const sorted = useMemo(() => {
    const copy = [...reports];
    if (sort === 'severity') {
      copy.sort(
        (a, b) =>
          (SEVERITY_RANK[b.severity ?? ''] ?? 0) - (SEVERITY_RANK[a.severity ?? ''] ?? 0) ||
          (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0),
      );
    } else {
      copy.sort((a, b) => (b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0));
    }
    return copy;
  }, [reports, sort]);

  return (
    <BottomSheetModal
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderColor: '#efeae0',
        borderWidth: 1,
        borderBottomWidth: 0,
      }}
      handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
    >
      <BottomSheetView style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold tracking-tight text-text">
            {reports.length} reports in view
          </Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${sort === 'newest' ? 'severity' : 'newest'}`}
            haptic="selection"
            pressedScale={0.95}
            onPress={() => setSort((s) => (s === 'newest' ? 'severity' : 'newest'))}
          >
            <View className="flex-row items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1">
              <ArrowUpDown size={12} color={palette.brand[700]} strokeWidth={2.4} />
              <Text className="text-xs font-bold text-brand-700">
                {sort === 'newest' ? 'Newest' : 'Severity'}
              </Text>
            </View>
          </PressableScale>
        </View>
      </BottomSheetView>

      {reports.length === 0 ? (
        <EmptyState
          emoji="🗺"
          title="No reports in view"
          description="Pan the map to see disease reports in another area."
        />
      ) : (
        <BottomSheetFlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/reports/[id]', params: { id: item.id } })}
            >
              <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-brand-50">
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                      cachePolicy="memory-disk"
                      recyclingKey={item.id}
                      placeholder={{ blurhash: 'L9F$kBM{IUM{ofWBWBay9F%MofRj' }}
                    />
                  ) : (
                    <Text className="text-lg">🌿</Text>
                  )}
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-text" numberOfLines={1}>
                    {item.cropType} · {item.disease ?? 'Diagnosing…'}
                  </Text>
                  <Text className="text-xs text-text-subtle">{timeAgo(item.createdAt)}</Text>
                </View>
                {item.severity ? (
                  <Chip
                    label={item.severity[0] + item.severity.slice(1).toLowerCase()}
                    tone={SEVERITY_TONE[item.severity] ?? 'warning'}
                  />
                ) : null}
                <ChevronRight size={16} color={palette.brand[700]} strokeWidth={2.2} />
              </View>
            </Pressable>
          )}
        />
      )}
    </BottomSheetModal>
  );
});
