import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { ChevronRight, Clock, ImageOff } from 'lucide-react-native';

import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import type { Report, Severity } from '@/features/upload-report/types';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { timeAgo } from '@/utils/severity';

interface ReportHistoryCardProps {
  report: Report;
}

const SEVERITY_TONE: Record<Severity, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

/**
 * One row in the "Your reports" history list. Shows the real crop photo,
 * crop · disease, a status/severity chip, and the analyzed time. Pending /
 * processing / failed states render their own affordance so the user can tell
 * a report is still being analyzed vs done.
 */
export const ReportHistoryCard = React.memo(function ReportHistoryCard({ report }: ReportHistoryCardProps) {
  const isTerminal = report.processingStatus === 'SUCCESS' || report.processingStatus === 'FAILED';
  const title =
    report.advisory?.primaryDiagnosis.displayName ??
    report.disease ??
    (report.processingStatus === 'FAILED' ? 'Analysis failed' : 'Analyzing…');

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${report.cropType} report`}
      onPress={() => router.push({ pathname: '/reports/[id]', params: { id: report.id } })}
      pressedScale={0.98}
      haptic="selection"
    >
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3">
        <View className="h-14 w-14 overflow-hidden rounded-xl bg-brand-50">
          {report.imageUrl ? (
            <Image
              source={{ uri: report.imageUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={report.id}
              placeholder={{ blurhash: 'L9F$kBM{IUM{ofWBWBay9F%MofRj' }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <ImageOff size={18} color={palette.brand[400]} strokeWidth={2} />
            </View>
          )}
        </View>

        <View className="flex-1 gap-0.5">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
            {report.cropType}
          </Text>
          <Text className="text-sm font-bold text-text" numberOfLines={1}>
            {title}
          </Text>
          <View className="flex-row items-center gap-1">
            <Clock size={11} color={palette.brand[400]} strokeWidth={2.2} />
            <Text className="text-[11px] text-text-subtle">
              {timeAgo(report.processedAt ?? report.createdAt)}
            </Text>
          </View>
        </View>

        {isTerminal && report.severity ? (
          <Chip
            label={SEVERITY_LABEL[report.severity]}
            tone={SEVERITY_TONE[report.severity] ?? 'warning'}
          />
        ) : !isTerminal ? (
          <Chip label="Processing" tone="info" />
        ) : report.processingStatus === 'FAILED' ? (
          <Chip label="Failed" tone="danger" />
        ) : null}

        <ChevronRight size={16} color={palette.brand[700]} strokeWidth={2.2} />
      </View>
    </PressableScale>
  );
});
