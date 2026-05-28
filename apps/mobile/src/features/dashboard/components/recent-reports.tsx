import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { SectionHeader } from '@/components/layout/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text, View } from '@/tw';

import type { Report } from '../types';

import { ReportCard } from './cards/report-card';

interface RecentReportsProps {
  reports?: Report[];
  loading?: boolean;
}

export function RecentReports({ reports, loading }: RecentReportsProps) {
  if (loading || !reports) {
    return (
      <View className="gap-3">
        <SectionHeader title="Recent reports" subtitle="From you and nearby farmers" />
        <View className="flex-row gap-3">
          <Skeleton height={224} width={176} rounded="2xl" />
          <Skeleton height={224} width={176} rounded="2xl" />
          <Skeleton height={224} width={176} rounded="2xl" />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <SectionHeader
        title="Recent reports"
        subtitle="From you and nearby farmers"
        trailing={
          <Pressable accessibilityRole="button" onPress={() => router.push('/notifications')}>
            <Text className="text-xs font-semibold text-brand-500">See all</Text>
          </Pressable>
        }
      />

      <View className="-mx-4 h-56">
        <FlashList
          data={reports}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View className="w-3" />}
          renderItem={({ item }) => <ReportCard report={item} />}
        />
      </View>
    </View>
  );
}
