import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, Clock, MapPin, X } from 'lucide-react-native';
import { forwardRef } from 'react';
import { Pressable } from 'react-native';

import { ConfidenceRing } from '@/features/disease-analysis/components/confidence-ring';
import { RecommendationsList } from '@/features/disease-analysis/components/recommendations-list';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import type { Report } from '@/features/upload-report/types';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { timeAgo } from '@/utils/severity';

import { formatDistanceKm, haversineKm } from '../utils/haversine';

interface ReportDetailSheetProps {
  report: Report | null;
  userLocation: { latitude: number; longitude: number } | null;
}

export const ReportDetailSheet = forwardRef<BottomSheetModal, ReportDetailSheetProps>(
  function ReportDetailSheet({ report, userLocation }, ref) {
    const theme = useTheme();

    const dismiss = () => {
      // @ts-expect-error ref
      ref?.current?.dismiss();
    };

    const distance =
      report && userLocation
        ? haversineKm(
            userLocation.latitude,
            userLocation.longitude,
            report.latitude,
            report.longitude,
          )
        : null;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['38%', '92%']}
        backgroundStyle={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: '#efeae0',
          borderBottomWidth: 0,
        }}
        handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
        )}
      >
        {!report ? null : (
          <BottomSheetScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 60, gap: 16 }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 gap-1">
                <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  {report.cropType}
                </Text>
                <Text className="text-2xl font-bold text-text" numberOfLines={2}>
                  {report.disease ?? 'Unknown'}
                </Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <SeverityBadge severity={report.severity} size="sm" />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface"
              >
                <X size={18} color={theme.text} strokeWidth={2} />
              </Pressable>
            </View>

            <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-3">
              <Image
                source={{ uri: report.imageUrl }}
                style={{ width: 80, height: 80, borderRadius: 12 }}
                contentFit="cover"
                transition={200}
              />
              <View className="flex-1 gap-2">
                {report.confidence != null ? (
                  <View className="flex-row items-center gap-2">
                    <ConfidenceRing
                      value={report.confidence}
                      severity={report.severity}
                      size={64}
                      strokeWidth={6}
                      label=""
                    />
                    <View className="flex-1 gap-0.5">
                      <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                        Confidence
                      </Text>
                      <Text className="text-base font-bold text-text">
                        {Math.round(report.confidence)}%
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="flex-row gap-2">
              {distance != null ? (
                <MetaPill
                  icon={<MapPin size={12} color={theme.textMuted} strokeWidth={2.2} />}
                  label={`${formatDistanceKm(distance)} away`}
                />
              ) : null}
              <MetaPill
                icon={<Clock size={12} color={theme.textMuted} strokeWidth={2.2} />}
                label={timeAgo(report.createdAt)}
              />
            </View>

            {report.notes ? (
              <View className="rounded-2xl border border-border bg-surface p-3">
                <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                  Farmer&apos;s notes
                </Text>
                <Text className="mt-1 text-sm leading-5 text-text">{report.notes}</Text>
              </View>
            ) : null}

            <View className="gap-2">
              <Text className="text-base font-semibold text-text">What we recommend</Text>
              <RecommendationsList items={report.recommendations} />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open full report"
              onPress={() => {
                dismiss();
                router.push({ pathname: '/reports/[id]', params: { id: report.id } });
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
            >
              <View
                className="h-12 flex-row items-center justify-center gap-2 rounded-2xl"
                style={{ backgroundColor: palette.brand[600] }}
              >
                <Text className="text-sm font-semibold text-white">Open full report</Text>
                <ChevronRight size={18} color="#fff" strokeWidth={2.2} />
              </View>
            </Pressable>
          </BottomSheetScrollView>
        )}
      </BottomSheetModal>
    );
  },
);

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5">
      {icon}
      <Text className="text-[11px] font-medium text-text-muted">{label}</Text>
    </View>
  );
}
