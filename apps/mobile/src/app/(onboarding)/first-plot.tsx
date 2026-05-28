import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { MapPickerSheet } from '@/features/upload-report/components/map-picker-sheet';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { PlotFormSheet } from '@/features/plots/components/plot-form-sheet';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export default function OnboardingFirstPlotScreen() {
  const formRef = useRef<BottomSheetModal>(null);
  const mapPickerRef = useRef<BottomSheetModal>(null);

  const finish = async () => {
    await onboardingStorage.setSkipped(true);
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-bg">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View className="flex-1 justify-end gap-6 px-5 pb-10">
          <Animated.View entering={FadeInUp.duration(450)}>
            <View className="gap-2 px-1">
              <Text className="text-xs font-medium uppercase tracking-wider text-white/60">
                Step 2 of 2
              </Text>
              <Text className="text-4xl font-bold tracking-tight text-white">
                Add your first plot
              </Text>
              <Text className="text-base text-white/70">
                We&apos;ll alert you when a disease outbreak is detected near it. You can add more
                plots anytime from your profile.
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(450)}>
            <View className="gap-3 rounded-3xl border border-white/15 bg-white/5 p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <Layers size={22} color="#ffffff" strokeWidth={2} />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-white">Plot-based alerts</Text>
                  <Text className="text-xs text-white/70">
                    No live tracking. Only fields you register.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(450)}>
            <View className="gap-2">
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Add a plot"
                onPress={() => formRef.current?.present()}
                haptic="light"
                pressedScale={0.97}
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  shadowColor: palette.brand[500],
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.32,
                  shadowRadius: 16,
                  elevation: 6,
                }}
              >
                <LinearGradient
                  colors={[palette.brand[400], palette.brand[600], palette.brand[700]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  locations={[0, 0.55, 1]}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }}
                  />
                  <View className="h-14 flex-row items-center justify-center px-5">
                    <Text className="text-base font-semibold text-white">Add a plot</Text>
                  </View>
                </LinearGradient>
              </PressableScale>
              <Pressable accessibilityRole="button" onPress={finish}>
                <View className="h-12 items-center justify-center rounded-2xl">
                  <Text className="text-sm font-medium text-white/70">I&apos;ll do this later</Text>
                </View>
              </Pressable>
            </View>
          </Animated.View>
        </View>
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
        onConfirm={() => {
          // Map confirms back to PlotFormSheet via its own state when opened from there.
          // For onboarding we keep it simple: closing the picker re-presents the form.
          formRef.current?.present();
        }}
      />
    </View>
  );
}
