import { GlassView } from 'expo-glass-effect';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

interface ProcessingStateProps {
  imageUrl: string;
  cropType: string;
}

const STATUS_MESSAGES = [
  'Detecting leaf patterns…',
  'Matching against disease library…',
  'Generating recommendations…',
];

const MESSAGE_INTERVAL_MS = 1800;

export function ProcessingState({ imageUrl: _imageUrl, cropType }: ProcessingStateProps) {
  const theme = useTheme();
  const scanY = useSharedValue(0);
  const pulse = useSharedValue(0);
  const messageIdx = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(scanY);
      cancelAnimation(pulse);
    };
  }, [scanY, pulse]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value * 220 }],
    opacity: 0.85,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + pulse.value * 0.5,
  }));

  // Cycle status text via interval
  useEffect(() => {
    const id = setInterval(() => {
      messageIdx.value = (messageIdx.value + 1) % STATUS_MESSAGES.length;
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [messageIdx]);

  return (
    <View className="gap-4">
      <View
        className="aspect-square w-full overflow-hidden rounded-3xl"
        style={{ backgroundColor: theme.surface }}
      >
        <Image
          source={{ uri: _imageUrl }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={250}
          cachePolicy="memory-disk"
        />

        {/* dimming overlay */}
        <View
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(11, 18, 32, 0.35)' }}
        />

        {/* horizontal scan line */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: 60,
            },
            scanStyle,
          ]}
        >
          <LinearGradient
            colors={['transparent', `${palette.brand[400]}88`, 'transparent']}
            style={{ flex: 1 }}
          />
          <View
            className="absolute left-0 right-0"
            style={{
              top: 30,
              height: 1.5,
              backgroundColor: palette.brand[400],
            }}
          />
        </Animated.View>

        {/* corners */}
        <View
          className="absolute"
          style={{
            top: 16,
            left: 16,
            width: 24,
            height: 24,
            borderTopWidth: 2,
            borderLeftWidth: 2,
            borderColor: palette.brand[400],
            borderTopLeftRadius: 8,
          }}
        />
        <View
          className="absolute"
          style={{
            top: 16,
            right: 16,
            width: 24,
            height: 24,
            borderTopWidth: 2,
            borderRightWidth: 2,
            borderColor: palette.brand[400],
            borderTopRightRadius: 8,
          }}
        />
        <View
          className="absolute"
          style={{
            bottom: 16,
            left: 16,
            width: 24,
            height: 24,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderColor: palette.brand[400],
            borderBottomLeftRadius: 8,
          }}
        />
        <View
          className="absolute"
          style={{
            bottom: 16,
            right: 16,
            width: 24,
            height: 24,
            borderBottomWidth: 2,
            borderRightWidth: 2,
            borderColor: palette.brand[400],
            borderBottomRightRadius: 8,
          }}
        />

        {/* glass status pill */}
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: 20 }}
        >
          <GlassView
            glassEffectStyle="regular"
            tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.15)' : 'rgba(11,18,32,0.85)'}
            style={{ borderRadius: 999, overflow: 'hidden' }}
          >
            <View className="flex-row items-center gap-2 rounded-full border border-white/15 px-4 py-2">
              <Animated.View
                style={[
                  {
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette.brand[400],
                  },
                  pulseStyle,
                ]}
              />
              <Text className="text-xs font-semibold uppercase tracking-wider text-white">
                Analyzing
              </Text>
            </View>
          </GlassView>
        </View>
      </View>

      <CyclingMessage cropType={cropType} />
    </View>
  );
}

function CyclingMessage({ cropType }: { cropType: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="items-center gap-2">
      <Animated.View style={style} className="flex-row items-center gap-2">
        <Activity size={16} color={palette.brand[400]} strokeWidth={2.4} />
        <Text className="text-base font-semibold text-text">
          Analyzing your {cropType.toLowerCase()}
        </Text>
      </Animated.View>
      <Text className="text-center text-xs text-text-muted">
        Our AI is comparing this photo against thousands of disease patterns. This usually takes
        a few seconds.
      </Text>
    </View>
  );
}
