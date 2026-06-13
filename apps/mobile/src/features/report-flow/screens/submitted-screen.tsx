import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import { useTranslation } from '@/i18n';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
  cropType: string | null;
  reportId: string | null;
  onAnother: () => void;
}

/**
 * Final step of the report flow. Confirms the submission and offers two paths
 * forward: open the report on the map, or kick off another report.
 */
export function SubmittedScreen({ result, cropType, reportId, onAnother }: Props) {
  const { t } = useTranslation();
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-5 px-6">
          <Animated.View entering={FadeIn.duration(400)}>
            <View
              className="h-20 w-20 items-center justify-center overflow-hidden rounded-full"
              style={{
                shadowColor: palette.brand[600],
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 18,
                elevation: 10,
              }}
            >
              <LinearGradient
                colors={[palette.brand[500], palette.brand[600]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Check size={36} color="#ffffff" strokeWidth={2.6} />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="items-center gap-1"
          >
            <Text className="text-2xl font-extrabold tracking-tight text-text">{t('reportFlow.submitted')}</Text>
            <Text className="text-center text-sm text-text-muted">
              {t('reportFlow.submittedDesc')}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(400)} className="self-stretch">
            <Card padding="md">
              <View className="flex-row flex-wrap items-center gap-2">
                <SeverityBadge severity={result.severity} />
                <Text className="text-sm font-bold text-text">
                  {cropType ?? '—'} · {result.disease ?? t('reportFlow.manualEntry')}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-text-subtle">{t('reportFlow.justNow')}</Text>
            </Card>
          </Animated.View>
        </View>

        <BottomActionBar divider={false}>
          <Button label={t('reportFlow.viewOnMap')} variant="ghost" onPress={() => router.replace('/map')} />
          <Button
            label={reportId ? t('reportFlow.viewThisReport') : t('reportFlow.reportAnother')}
            variant="gradient"
            onPress={() =>
              reportId
                ? router.replace({ pathname: '/reports/[id]', params: { id: reportId } })
                : onAnother()
            }
          />
        </BottomActionBar>
      </SafeAreaView>
    </View>
  );
}
