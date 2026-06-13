import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { useRef } from 'react';
import { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { PlotFormSheet } from '@/features/plots/components/plot-form-sheet';
import { MapPickerSheet } from '@/features/upload-report/components/map-picker-sheet';
import { palette } from '@/theme/colors';
import { AnimatedView, Text, View } from '@/tw';

export default function OnboardingFirstPlotScreen() {
  const formRef = useRef<BottomSheetModal>(null);
  const mapPickerRef = useRef<BottomSheetModal>(null);

  const finish = async () => {
    await onboardingStorage.setSkipped(true);
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="px-4 pt-3">
          <SectionLabel>Step 2 of 2</SectionLabel>
        </View>

        <View className="flex-1 justify-center gap-4 px-4">
          <AnimatedView entering={FadeInDown.duration(400)} className="gap-2">
            <Text className="text-3xl font-extrabold tracking-tight text-text">
              Add your first plot
            </Text>
            <Text className="text-sm text-text-muted">
              We&apos;ll alert you when a disease outbreak is detected near it. You can add more
              plots anytime from your profile.
            </Text>
          </AnimatedView>

          <AnimatedView entering={FadeInDown.delay(100).duration(400)}>
            <Card padding="md">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <Layers size={22} color={palette.brand[700]} strokeWidth={2} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-text">Plot-based alerts</Text>
                  <Text className="text-xs text-text-muted">
                    No live tracking. Only fields you register.
                  </Text>
                </View>
              </View>
            </Card>
          </AnimatedView>
        </View>

        <BottomActionBar divider={false}>
          <Button
            label="Add a plot"
            variant="gradient"
            size="lg"
            onPress={() => formRef.current?.present()}
          />
          <Button label="I'll do this later" variant="ghost" size="md" onPress={finish} />
        </BottomActionBar>
      </SafeAreaView>

      <PlotFormSheet
        ref={formRef}
        onSaved={() => {
          void onboardingStorage.setSkipped(true);
          router.replace('/');
        }}
        onOpenMapPicker={() => mapPickerRef.current?.present()}
      />
      <MapPickerSheet
        ref={mapPickerRef}
        initialLocation={null}
        onConfirm={() => formRef.current?.present()}
      />
    </View>
  );
}
