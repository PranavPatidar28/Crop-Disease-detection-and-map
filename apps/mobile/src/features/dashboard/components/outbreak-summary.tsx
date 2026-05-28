import { Pressable } from 'react-native';

import { SectionHeader } from '@/components/layout/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text, View } from '@/tw';
import { router } from 'expo-router';

import type { DashboardSummary } from '../types';

import { StatCard } from './cards/stat-card';

interface OutbreakSummaryProps {
  summary?: DashboardSummary;
  loading?: boolean;
}

export function OutbreakSummary({ summary, loading }: OutbreakSummaryProps) {
  if (loading || !summary) {
    return (
      <View className="gap-3">
        <SectionHeader title="At a glance" subtitle="Your district right now" />
        <View className="flex-row gap-3">
          <Skeleton height={108} className="flex-1" rounded="2xl" />
          <Skeleton height={108} className="flex-1" rounded="2xl" />
        </View>
        <Skeleton height={108} rounded="2xl" />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <SectionHeader
        title="At a glance"
        subtitle="Your district right now"
        trailing={
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/map')}
          >
            <Text className="text-xs font-semibold text-brand-500">View map</Text>
          </Pressable>
        }
      />

      <View className="flex-row gap-3">
        <StatCard
          label="Active outbreaks"
          value={summary.activeOutbreaks}
          variant="brand"
          className="flex-1"
        />
        <StatCard
          label="High-severity zones"
          value={summary.highSeverityZones}
          className="flex-1"
        />
      </View>

      <StatCard
        label="Reports this week"
        value={summary.reportsThisWeek}
        deltaPercent={12}
      />
    </View>
  );
}
