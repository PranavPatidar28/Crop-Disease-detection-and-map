import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Image as ImageIcon, X, Zap } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  onCaptured: (image: CapturedImage) => void;
  onCancel: () => void;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

/**
 * Step 1 of the report flow. Lets the farmer either snap a fresh photo
 * via the camera or pick an existing one from the gallery. Both routes
 * call `onCaptured` with the resolved {uri, width, height}; cancellation
 * and permission denial fall through silently.
 */
export function CaptureScreen({ onCaptured, onCancel }: Props) {
  const launch = async (mode: 'camera' | 'library') => {
    if (mode === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }
    const result =
      mode === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    onCaptured({ uri: a.uri, width: a.width, height: a.height });
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-4 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              onCancel();
              router.back();
            }}
            className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
          >
            <X size={18} color={palette.brand[700]} strokeWidth={2.2} />
          </Pressable>
          <Text className="text-xs font-bold uppercase tracking-[1.4px] text-brand-700">
            Step 1 of 4
          </Text>
          <View className="h-10 w-10" />
        </View>

        <Animated.View
          entering={FadeIn.duration(300)}
          className="mx-4 mb-4 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface"
        >
          <View className="items-center gap-3 px-8">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-brand-50">
              <ImageIcon size={36} color={palette.brand[600]} strokeWidth={2} />
            </View>
            <Text className="text-lg font-bold text-text">Take a photo</Text>
            <Text className="text-center text-sm text-text-muted">
              Frame the affected leaf so it fills the square. Natural light works best.
            </Text>
          </View>
        </Animated.View>

        <View className="flex-row items-center justify-around px-4 pb-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            onPress={() => void launch('library')}
            haptic="selection"
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
          >
            <ImageIcon size={20} color={palette.brand[700]} strokeWidth={2.2} />
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            onPress={() => void launch('camera')}
            haptic="medium"
            pressedScale={0.92}
            className="h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[4px] border-surface"
            style={{
              shadowColor: palette.brand[600],
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <View
              style={{ position: 'absolute', inset: 0, backgroundColor: palette.brand[600] }}
            />
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Tips"
            onPress={() => undefined}
            haptic="selection"
            className="h-12 w-12 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Zap size={20} color={palette.brand[700]} strokeWidth={2.2} />
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
}
