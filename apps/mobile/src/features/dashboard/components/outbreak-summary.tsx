import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionLabel } from '@/components/ui/section-label';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/i18n';
import { usePreferencesStore } from '@/store/preferences.store';
import { Text, View } from '@/tw';

import type { DashboardSummary } from '../types';

interface OutbreakSummaryProps {
  summary?: DashboardSummary;
  loading?: boolean;
}

/**
 * The Home hero card. Big number = active outbreaks today within the user's
 * configured alert radius, with a stable/rising/falling pill, a "+N new" pill,
 * and a context line.
 */
export function OutbreakSummary({ summary, loading }: OutbreakSummaryProps) {
  const { t } = useTranslation();
  const alertRadiusKm = usePreferencesStore((s) => s.alertRadiusKm);

  if (loading || !summary) {
    return <Skeleton height={140} rounded="xl" />;
  }

  const newCount = summary.reportsThisWeek ?? 0;
  const trend: { label: string; tone: 'success' | 'warning' | 'info' } =
    summary.activeOutbreaks <= 3
      ? { label: t('dashboard.trendStable'), tone: 'success' }
      : summary.activeOutbreaks > 10
        ? { label: t('dashboard.trendRising'), tone: 'warning' }
        : { label: t('dashboard.trendActive'), tone: 'info' };

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push('/map')}
      pressedScale={0.99}
      haptic="selection"
    >
      <Card variant="glow" padding="lg">
        <SectionLabel>{t('dashboard.todayRadius', { km: alertRadiusKm })}</SectionLabel>
        <View className="mt-2 flex-row items-end justify-between">
          <Text
            className="font-extrabold text-brand-900"
            style={{ fontSize: 44, lineHeight: 48, letterSpacing: -1.6 }}
          >
            {summary.activeOutbreaks}
          </Text>
          <View className="flex-row gap-2 pb-2">
            <Chip label={trend.label} tone={trend.tone} />
            {newCount > 0 ? (
              <Chip label={t('dashboard.newCount', { count: newCount })} tone="warning" />
            ) : null}
          </View>
        </View>
        <Text className="mt-2 text-xs text-text-muted">
          {summary.highSeverityZones > 0
            ? t('dashboard.highSeverityZones', { count: summary.highSeverityZones })
            : t('dashboard.noHighSeverity')}
        </Text>
      </Card>
    </PressableScale>
  );
}
