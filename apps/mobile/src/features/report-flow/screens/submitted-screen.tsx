import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import { SeverityPill } from '../components/severity-pill';
import type { AnalysisResult } from '../types';

interface Props {
  result: AnalysisResult;
  cropType: string | null;
  shareToMap: boolean;
  reportId: string | null;
  onAnother: () => void;
}

/**
 * Step 4 of the report flow. Confirms the submission and offers two paths
 * forward: open the report on the map, or kick off another report.
 */
export function SubmittedScreen({ result, cropType, shareToMap, reportId, onAnother }: Props) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
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
                style={{ position: 'absolute', inset: 0 }}
              />
              <Check size={36} color="#ffffff" strokeWidth={2.6} />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="items-center gap-1"
          >
            <Text className="text-2xl font-extrabold tracking-tight text-text">Submitted</Text>
            <Text className="text-center text-sm text-text-muted">
              {shareToMap
                ? 'Visible to nearby agronomists and farmers.'
                : 'Saved to your history. Not added to the public map.'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).duration(400)} className="self-stretch">
            <Card padding="md">
              <View className="flex-row flex-wrap items-center gap-2">
                {result.severity ? <SeverityPill severity={result.severity} /> : null}
                <Text className="text-sm font-bold text-text">
                  {cropType ?? '—'} · {result.disease ?? 'Manual entry'}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-text-subtle">just now</Text>
            </Card>
          </Animated.View>
        </View>

        <View className="gap-2 px-4 pb-4">
          <Button label="View on map" variant="ghost" onPress={() => router.replace('/map')} />
          <Button
            label={reportId ? 'View this report' : 'Report another'}
            variant="gradient"
            onPress={() =>
              reportId
                ? router.replace({ pathname: '/reports/[id]', params: { id: reportId } })
                : onAnother()
            }
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
