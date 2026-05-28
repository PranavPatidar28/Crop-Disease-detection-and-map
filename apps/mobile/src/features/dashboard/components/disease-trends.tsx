import { SectionHeader } from '@/components/layout/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { View } from '@/tw';

import type { Trend } from '../types';

import { StatCard } from './cards/stat-card';

interface DiseaseTrendsProps {
  trends?: Trend[];
  loading?: boolean;
}

export function DiseaseTrends({ trends, loading }: DiseaseTrendsProps) {
  if (loading || !trends) {
    return (
      <View className="gap-3">
        <SectionHeader title="Disease trends" subtitle="Last 7 days · your region" />
        <View className="flex-row flex-wrap gap-3">
          <Skeleton height={120} className="flex-1 min-w-[45%]" rounded="2xl" />
          <Skeleton height={120} className="flex-1 min-w-[45%]" rounded="2xl" />
          <Skeleton height={120} className="flex-1 min-w-[45%]" rounded="2xl" />
          <Skeleton height={120} className="flex-1 min-w-[45%]" rounded="2xl" />
        </View>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <SectionHeader title="Disease trends" subtitle="Last 7 days · your region" />

      <View className="flex-row flex-wrap gap-3">
        {trends.map((trend) => (
          <View key={trend.id} style={{ flexBasis: '47%', flexGrow: 1 }}>
            <StatCard
              label={trend.disease}
              value={trend.history[trend.history.length - 1] ?? 0}
              deltaPercent={trend.deltaPercent}
              history={trend.history}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
