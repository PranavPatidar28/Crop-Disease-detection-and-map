import { Image } from 'expo-image';
import { Pencil } from 'lucide-react-native';
import { Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import { EngineBadge } from '../components/engine-badge';
import { RecommendationsCard } from '../components/recommendations-card';
import { SeverityPill } from '../components/severity-pill';
import { ShareToggleCard } from '../components/share-toggle-card';
import {
  LOW_CONFIDENCE_THRESHOLD,
  type AnalysisResult,
  type CapturedImage,
} from '../types';

interface Props {
  image: CapturedImage;
  result: AnalysisResult;
  shareToMap: boolean;
  submitting: boolean;
  onShareChange: (next: boolean) => void;
  onEdit: () => void;
  onPickCandidate: (disease: string) => void;
  onConfirm: () => void;
}

/**
 * Step 3 of the report flow. Renders the engine's diagnosis (or the manual
 * fallback when both engines failed), the recommended actions, an "Edit
 * details" escape hatch, and the map-share toggle. When confidence < 0.6
 * and candidates are present, the screen flips into a candidate-picker
 * mode where treatment is hidden until the farmer picks the closest match.
 */
export function ResultScreen({
  image,
  result,
  shareToMap,
  submitting,
  onShareChange,
  onEdit,
  onPickCandidate,
  onConfirm,
}: Props) {
  const lowConfidence = !!(
    result.candidates &&
    result.candidates.length > 0 &&
    result.confidence !== null &&
    result.confidence < LOW_CONFIDENCE_THRESHOLD
  );

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-center px-4 py-2">
          <Text className="text-xs font-bold uppercase tracking-[1.4px] text-brand-700">
            Step 3 of 4
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(300)}
            className="flex-row items-center gap-3"
          >
            <Image
              source={{ uri: image.uri }}
              style={{ width: 64, height: 64, borderRadius: 12 }}
              contentFit="cover"
            />
            <View className="flex-1 gap-1">
              <Text className="text-lg font-extrabold tracking-tight text-text">
                {lowConfidence ? 'Pick the closest match' : (result.disease ?? 'Manual entry')}
              </Text>
              {result.engine !== 'manual' && result.confidence !== null ? (
                <Text className="text-xs text-text-subtle">
                  {result.engine === 'cloud' ? 'Cloud diagnosis' : 'On-device diagnosis'} ·{' '}
                  {Math.round(result.confidence * 100)}% match
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <View className="flex-row flex-wrap gap-2">
            {result.severity ? <SeverityPill severity={result.severity} /> : null}
            {result.status ? (
              <Chip
                label={result.status[0].toUpperCase() + result.status.slice(1)}
                tone="brand"
              />
            ) : null}
            <EngineBadge engine={result.engine} confidence={result.confidence ?? undefined} />
          </View>

          {lowConfidence ? (
            <View className="gap-2">
              <SectionLabel>Possible matches</SectionLabel>
              {result.candidates!.map((c) => (
                <Pressable
                  key={c.disease}
                  accessibilityRole="button"
                  onPress={() => onPickCandidate(c.disease)}
                  className="flex-row items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <Text className="flex-1 text-sm font-bold text-text">{c.disease}</Text>
                  <Text className="text-xs font-bold text-brand-700">
                    {Math.round(c.confidence * 100)}%
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <RecommendationsCard items={result.recommendations} />
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            className="flex-row items-center gap-2 self-start rounded-full border border-border bg-surface px-3 py-2"
          >
            <Pencil size={12} color={palette.brand[700]} strokeWidth={2.4} />
            <Text className="text-xs font-bold text-brand-700">
              Wrong diagnosis? Edit details
            </Text>
          </Pressable>

          <ShareToggleCard value={shareToMap} onChange={onShareChange} />
        </ScrollView>

        <View className="border-t border-border bg-surface px-4 py-3">
          <Button
            label={submitting ? 'Submitting…' : 'Confirm & submit'}
            variant="gradient"
            size="lg"
            loading={submitting}
            onPress={onConfirm}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
