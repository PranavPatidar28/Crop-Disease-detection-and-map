import { router, useLocalSearchParams } from 'expo-router';
import { MoreHorizontal, RefreshCw } from 'lucide-react-native';
import { ActionSheetIOS, Alert, Platform, Share, ScrollView } from 'react-native';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Loader } from '@/components/ui/loader';
import { SectionLabel } from '@/components/ui/section-label';
import { TextButton } from '@/components/ui/text-button';
import { ConfidenceRing } from '@/features/disease-analysis/components/confidence-ring';
import { DiseaseAdvisory } from '@/features/disease-analysis/components/disease-advisory';
import { ProcessingState } from '@/features/disease-analysis/components/processing-state';
import { RecommendationsList } from '@/features/disease-analysis/components/recommendations-list';
import { ResultActions } from '@/features/disease-analysis/components/result-actions';
import { ResultHero } from '@/features/disease-analysis/components/result-hero';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import { useReport, useReprocessReport } from '@/features/disease-analysis/hooks/use-report';
import { palette } from '@/theme/colors';
import { AnimatedView, Text, View } from '@/tw';
import { timeAgo } from '@/utils/severity';

/**
 * Soft Sage report-detail screen. Reads the report by id and renders one of
 * three states: loading, processing (the AI run is in flight), or the full
 * result. The "failed" branch from earlier versions is folded into the result
 * branch — when the engine fails we still surface whatever fields the user
 * filled out manually, plus the retry CTA in `ResultActions`.
 */
export default function ReportDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id;

  const { data: report, isPending, isError, refetch } = useReport(id);
  const reprocess = useReprocessReport(id);

  const shareReport = async () => {
    if (!report) return;
    try {
      await Share.share({
        message: `Crop diagnosis from AgroRadar\n\n${report.cropType} · ${
          report.disease ?? 'unknown'
        } (${report.confidence ?? 0}% confidence)\n\nReport ID: ${report.id}`,
        title: 'Crop disease report',
      });
    } catch {
      /* dismissed */
    }
  };

  const openMenu = () => {
    if (!report) return;
    const canReprocess = report.processingStatus !== 'PROCESSING' && !reprocess.isPending;
    const labels = ['Share report'];
    if (canReprocess) labels.push('Re-run analysis');
    labels.push('Cancel');
    const cancelIndex = labels.length - 1;

    const run = (i: number) => {
      if (labels[i] === 'Share report') void shareReport();
      else if (labels[i] === 'Re-run analysis') reprocess.mutate();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: cancelIndex },
        run,
      );
    } else {
      Alert.alert('Report options', undefined, [
        { text: 'Share report', onPress: () => void shareReport() },
        ...(canReprocess
          ? [{ text: 'Re-run analysis', onPress: () => reprocess.mutate() }]
          : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <BackButton onPress={() => router.back()} />
          <Text className="text-base font-bold text-text">Report</Text>
          <IconButton
            accessibilityLabel="More options"
            icon={<MoreHorizontal size={18} color={palette.brand[700]} strokeWidth={2.2} />}
            onPress={openMenu}
          />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}
        >
          {isPending ? (
            <View className="items-center justify-center py-20">
              <Loader size={48} />
            </View>
          ) : isError || !report ? (
            <View className="items-center gap-3 py-10">
              <Text className="text-base font-bold text-text">Couldn&apos;t load report</Text>
              <Button label="Retry" variant="ghost" onPress={() => refetch()} fullWidth={false} />
            </View>
          ) : report.processingStatus === 'PENDING' || report.processingStatus === 'PROCESSING' ? (
            <AnimatedView entering={FadeIn.duration(400)}>
              <ProcessingState imageUrl={report.imageUrl} cropType={report.cropType} />
            </AnimatedView>
          ) : (
            <>
              <AnimatedView entering={FadeIn.duration(400)}>
                <ResultHero
                  imageUrl={report.imageUrl}
                  cropType={report.cropType}
                  severity={report.severity}
                />
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(100).duration(400)}>
                <Card padding="md">
                  <View className="flex-row items-center gap-4">
                    <ConfidenceRing
                      value={report.confidence ?? 0}
                      severity={report.severity}
                      size={120}
                      strokeWidth={10}
                    />
                    <View className="flex-1 gap-1">
                      <SectionLabel>Detected</SectionLabel>
                      <Text className="text-lg font-extrabold tracking-tight text-text">
                        {report.advisory?.primaryDiagnosis.displayName ?? report.disease ?? 'Unknown'}
                      </Text>
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <SeverityBadge severity={report.severity} />
                        {report.advisory?.primaryDiagnosis.confidenceBadge ? (
                          <Chip
                            label={`${report.advisory.primaryDiagnosis.confidenceBadge} confidence`}
                            tone="brand"
                          />
                        ) : null}
                      </View>
                      {report.processedAt ? (
                        <Text className="mt-1 text-[11px] text-text-subtle">
                          Analyzed {timeAgo(report.processedAt)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Card>
              </AnimatedView>

              {report.notes ? (
                <AnimatedView entering={FadeInDown.delay(160).duration(400)}>
                  <Card padding="md">
                    <SectionLabel>Your notes</SectionLabel>
                    <Text className="mt-1 text-sm leading-5 text-text">{report.notes}</Text>
                  </Card>
                </AnimatedView>
              ) : null}

              <AnimatedView entering={FadeInDown.delay(200).duration(400)} className="gap-2">
                <View className="flex-row items-center justify-between px-1">
                  <Text className="text-base font-bold tracking-tight text-text">
                    {report.advisory ? 'Advisory' : 'Recommended actions'}
                  </Text>
                  <TextButton
                    label={reprocess.isPending ? 'Re-analyzing…' : 'Re-run'}
                    size="sm"
                    disabled={reprocess.isPending}
                    leftSlot={<RefreshCw size={12} color={palette.brand[700]} strokeWidth={2.4} />}
                    onPress={() => reprocess.mutate()}
                  />
                </View>
                {report.advisory ? (
                  <DiseaseAdvisory advisory={report.advisory} />
                ) : (
                  <RecommendationsList items={report.recommendations} />
                )}
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(260).duration(400)}>
                <ResultActions
                  report={report}
                  onUploadAnother={() => router.replace('/report')}
                  onViewOnMap={() => router.push('/map')}
                />
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(320).duration(400)}>
                <Text className="px-2 text-[11px] text-text-subtle">
                  AI predictions are advisory. For high-severity diagnoses, consult your local
                  agricultural extension officer.
                </Text>
              </AnimatedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
