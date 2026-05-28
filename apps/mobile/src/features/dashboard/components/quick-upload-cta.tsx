import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export function QuickUploadCTA() {
  const theme = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.6 }],
    opacity: 0.6 - pulse.value * 0.6,
  }));

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}99` : theme.surfaceElevated}
      style={{ borderRadius: 28, overflow: 'hidden' }}
    >
      <View className="rounded-[28px] border border-white/10 p-5">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center">
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: palette.brand[500],
                },
                ringStyle,
              ]}
            />
            <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-full">
              <LinearGradient
                colors={[palette.brand[400], palette.brand[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ position: 'absolute', inset: 0 }}
              />
              <Text className="text-3xl">📷</Text>
            </View>
          </View>

          <View className="flex-1 gap-0.5">
            <Text className="text-base font-semibold text-text">Diagnose a crop</Text>
            <Text className="text-xs text-text-muted">
              Snap a photo and get an AI-powered disease report.
            </Text>
          </View>
        </View>

        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push('/upload')}
          haptic="light"
          pressedScale={0.97}
          style={{
            marginTop: 16,
            borderRadius: 16,
            overflow: 'hidden',
            shadowColor: palette.brand[500],
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.28,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <LinearGradient
            colors={[palette.brand[500], palette.brand[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Soft top sheen for depth */}
            <LinearGradient
              colors={['rgba(255,255,255,0.20)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }}
            />
            <View className="h-12 flex-row items-center justify-center gap-2 px-4">
              <Text className="text-sm font-semibold text-white">Upload a crop photo</Text>
              <Text className="text-base text-white">→</Text>
            </View>
          </LinearGradient>
        </PressableScale>
      </View>
    </GlassView>
  );
}
