import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ChevronLeft,
  Clock,
  Leaf,
  RefreshCw,
} from 'lucide-react-native';
import { ActivityIndicator, Platform, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ConfidenceRing } from '@/features/disease-analysis/components/confidence-ring';
import { ProcessingState } from '@/features/disease-analysis/components/processing-state';
import { RecommendationsList } from '@/features/disease-analysis/components/recommendations-list';
import { ResultActions } from '@/features/disease-analysis/components/result-actions';
import { ResultHero } from '@/features/disease-analysis/components/result-hero';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import { useReport, useReprocessReport } from '@/features/disease-analysis/hooks/use-report';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { timeAgo } from '@/utils/severity';

export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;
  const theme = useTheme();

  const { data: report, isPending, isError, refetch } = useReport(id);
  const reprocess = useReprocessReport(id);

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0, opacity: 0.45 }}
      />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            haptic="selection"
            pressedScale={0.9}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft size={20} color="#fff" strokeWidth={2.2} />
          </PressableScale>
          <Text className="text-base font-semibold text-white">Diagnosis</Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }}
        >
          {isPending ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : isError || !report ? (
            <ErrorCard onRetry={() => refetch()} />
          ) : report.processingStatus === 'PENDING' ||
            report.processingStatus === 'PROCESSING' ? (
            <Animated.View entering={FadeIn.duration(400)}>
              <ProcessingState imageUrl={report.imageUrl} cropType={report.cropType} />
            </Animated.View>
          ) : report.processingStatus === 'FAILED' ? (
            <FailedState
              imageUrl={report.imageUrl}
              error={report.aiError}
              isReprocessing={reprocess.isPending}
              onReprocess={() => reprocess.mutate()}
            />
          ) : (
            <SuccessContent
              report={report}
              onReprocess={() => reprocess.mutate()}
              isReprocessing={reprocess.isPending}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SuccessContent({
  report,
  onReprocess,
  isReprocessing,
}: {
  report: NonNullable<ReturnType<typeof useReport>['data']>;
  onReprocess: () => void;
  isReprocessing: boolean;
}) {
  const theme = useTheme();

  return (
    <View className="gap-5">
      <Animated.View entering={FadeIn.duration(400)}>
        <ResultHero
          imageUrl={report.imageUrl}
          cropType={report.cropType}
          severity={report.severity}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(420)}>
        <GlassView
          glassEffectStyle="regular"
          tintColor={
            Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated
          }
          style={{ borderRadius: 28, overflow: 'hidden' }}
        >
          <View className="rounded-[28px] border border-white/10 p-5">
            <View className="flex-row items-center gap-5">
              <ConfidenceRing
                value={report.confidence ?? 0}
                severity={report.severity}
                size={140}
                strokeWidth={12}
              />
              <View className="flex-1 gap-2">
                <Text className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
                  Detected
                </Text>
                <Text className="text-xl font-bold text-text">
                  {report.disease ?? 'Unknown'}
                </Text>
                <SeverityBadge severity={report.severity} />
                {report.processedAt ? (
                  <View className="flex-row items-center gap-1.5">
                    <Clock size={11} color={theme.textSubtle} strokeWidth={2} />
                    <Text className="text-[11px] text-text-subtle">
                      Analyzed {timeAgo(report.processedAt)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </GlassView>
      </Animated.View>

      {report.notes ? (
        <Animated.View entering={FadeInDown.delay(160).duration(420)}>
          <GlassView
            glassEffectStyle="regular"
            tintColor={
              Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated
            }
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <View className="gap-1 rounded-[20px] border border-white/10 p-3">
              <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                Your notes
              </Text>
              <Text className="text-sm leading-5 text-text">{report.notes}</Text>
            </View>
          </GlassView>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(200).duration(420)} className="gap-2">
        <View className="flex-row items-center justify-between px-1">
          <Text className="text-base font-semibold text-text">What we recommend</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Re-run analysis"
            onPress={onReprocess}
            disabled={isReprocessing}
            haptic="selection"
            pressedScale={0.95}
            style={{ opacity: isReprocessing ? 0.5 : 1 }}
          >
            <View className="flex-row items-center gap-1">
              <RefreshCw size={12} color={palette.brand[400]} strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-brand-300">
                {isReprocessing ? 'Re-analyzing…' : 'Re-run'}
              </Text>
            </View>
          </PressableScale>
        </View>
        <RecommendationsList items={report.recommendations} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(420)}>
        <ResultActions
          report={report}
          onUploadAnother={() => router.replace('/upload')}
          onViewOnMap={() => router.push('/map')}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(320).duration(420)}>
        <View className="flex-row items-start gap-2 px-2">
          <Leaf size={12} color={theme.textSubtle} strokeWidth={2} />
          <Text className="flex-1 text-[11px] text-text-subtle">
            AI predictions are advisory. For high-severity diagnoses, consult your local
            agricultural extension officer.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

function FailedState({
  imageUrl,
  error,
  onReprocess,
  isReprocessing,
}: {
  imageUrl: string;
  error: string | null;
  onReprocess: () => void;
  isReprocessing: boolean;
}) {
  const theme = useTheme();

  return (
    <View className="gap-4">
      <ResultHero imageUrl={imageUrl} cropType="—" severity={null} />

      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated}
        style={{ borderRadius: 24, overflow: 'hidden' }}
      >
        <View className="items-center gap-3 rounded-[24px] border border-danger/30 p-5">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-danger/15">
            <AlertCircle size={22} color="#ef4444" strokeWidth={2.2} />
          </View>
          <View className="items-center gap-1">
            <Text className="text-base font-semibold text-text">Couldn&apos;t analyze</Text>
            <Text className="text-center text-xs text-text-muted">
              {error ?? 'Our AI service didn&apos;t respond in time. You can retry now.'}
            </Text>
          </View>
          <Button
            label={isReprocessing ? 'Retrying…' : 'Retry analysis'}
            onPress={onReprocess}
            loading={isReprocessing}
          />
        </View>
      </GlassView>
    </View>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="items-center gap-3 py-10">
      <Text className="text-base font-semibold text-text">Couldn&apos;t load report</Text>
      <Button label="Retry" variant="secondary" onPress={onRetry} />
    </View>
  );
}
