import BottomSheet, { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { forwardRef, useMemo } from 'react';
import { Pressable } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Chip } from '@/components/ui/chip';
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

/**
 * Persistent bottom sheet listing the reports currently visible on the map.
 * Snap points: 25%, 60%, 92%. Closing isn't allowed — it's a list view, not
 * a modal.
 */
export const ReportsInViewSheet = forwardRef<BottomSheet, Props>(function ReportsInViewSheet(
  { reports },
  ref,
) {
  const snapPoints = useMemo(() => ['25%', '60%', '92%'], []);

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
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
          <Text className="text-xs text-text-subtle">Sort: newest</Text>
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
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/reports/[id]', params: { id: item.id } })}
            >
              <View className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                  <Text className="text-lg">🌿</Text>
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
    </BottomSheet>
  );
});
