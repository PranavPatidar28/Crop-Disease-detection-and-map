import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { useRef } from 'react';
import { ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { CROP_BY_NAME } from '@/constants/crops';
import { DiseaseAdvisory } from '@/features/disease-analysis/components/disease-advisory';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import { CropPickerRow } from '@/features/upload-report/components/crop-picker-row';
import { CropPickerSheet } from '@/features/upload-report/components/crop-picker-sheet';
import { NotesInput } from '@/features/upload-report/components/notes-input';
import { Text, View } from '@/tw';

import type { AnalysisResult, CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
  result: AnalysisResult;
  cropType: string | null;
  notes: string;
  submitting: boolean;
  onChangeCrop: (cropName: string) => void;
  onChangeNotes: (notes: string) => void;
  onConfirm: () => void;
}

const ENGINE_LABEL: Record<AnalysisResult['engine'], string> = {
  cloud: 'Cloud AI',
  'on-device': 'On-device',
  manual: 'Manual entry',
};

/** First recommended action, surfaced inline as "DO THIS FIRST". */
function firstAction(result: AnalysisResult): string | null {
  const list = result.advisory?.whatToDoNow?.length
    ? result.advisory.whatToDoNow
    : result.advisory?.rag.immediateActions ?? [];
  return list[0] ?? null;
}

/**
 * Layout B: triage answer up top, deeper advisory in expandable rows below.
 * The full advisory (symptoms, all steps, prevention, alternatives, expert
 * advice) is rendered by DiseaseAdvisory when present (cloud engine).
 */
export function ResultScreen({
  image,
  result,
  cropType,
  notes,
  submitting,
  onChangeCrop,
  onChangeNotes,
  onConfirm,
}: Props) {
  const cropSheetRef = useRef<BottomSheetModal>(null);
  const action = firstAction(result);
  const displayName = result.advisory?.primaryDiagnosis.displayName ?? result.disease ?? 'Manual entry';
  const crop = cropType ?? result.detectedCrop ?? null;
  const cropId = crop ? CROP_BY_NAME[crop.toLowerCase()]?.id ?? null : null;

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Answer card */}
          <Animated.View
            entering={FadeIn.duration(300)}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <View className="flex-row gap-3 p-3">
              <Image
                source={{ uri: image.uri }}
                style={{ width: 64, height: 64, borderRadius: 12 }}
                contentFit="cover"
              />
              <View className="flex-1 gap-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-brand-700">
                  {crop ? `${crop} · ` : ''}
                  {result.confidence != null ? `${result.confidence}% · ` : ''}
                  {ENGINE_LABEL[result.engine]}
                </Text>
                <Text className="text-lg font-extrabold leading-tight tracking-tight text-text">
                  {displayName}
                </Text>
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={result.severity} />
                  {result.advisory?.urgency ? (
                    <Chip label={result.advisory.urgency} tone="warning" />
                  ) : null}
                </View>
              </View>
            </View>
            {action ? (
              <View className="border-t border-brand-100 bg-brand-50 px-3 py-2.5">
                <SectionLabel>Do this first</SectionLabel>
                <Text className="mt-0.5 text-sm font-semibold text-text">{action}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Rich advisory (cloud engine) */}
          {result.advisory ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <DiseaseAdvisory advisory={result.advisory} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text className="px-2 text-sm leading-5 text-text-muted">
                {result.engine === 'on-device'
                  ? 'Diagnosed offline. A full advisory will appear once this report syncs.'
                  : 'No automated diagnosis. Set the crop and add details before submitting.'}
              </Text>
            </Animated.View>
          )}

          {/* Crop correction — lets the farmer fix a wrong detected crop */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)} className="gap-1.5">
            <View className="flex-row items-center justify-between px-1">
              <SectionLabel>{crop ? 'Wrong crop? Tap to change' : 'Which crop is this?'}</SectionLabel>
            </View>
            <CropPickerRow cropId={cropId} onPress={() => cropSheetRef.current?.present()} />
          </Animated.View>

          {/* Optional notes — context that helps an officer reviewing the report */}
          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <NotesInput value={notes} onChangeText={onChangeNotes} />
          </Animated.View>
        </ScrollView>

        <BottomActionBar>
          <Button
            label={submitting ? 'Submitting…' : 'Confirm & submit'}
            variant="gradient"
            size="lg"
            loading={submitting}
            onPress={onConfirm}
          />
        </BottomActionBar>
      </SafeAreaView>

      <CropPickerSheet
        ref={cropSheetRef}
        selectedId={cropId}
        onSelect={(c) => onChangeCrop(c.name)}
      />
    </View>
  );
}
