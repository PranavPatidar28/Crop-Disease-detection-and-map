import { Image } from 'expo-image';
import { Camera as CameraIcon, RefreshCw } from 'lucide-react-native';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { Button } from '@/components/ui/button';
import { palette } from '@/theme/colors';
import { AnimatedView, Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
  guidance: string;
  onRetake: () => void;
}

/**
 * Shown when HF reports the photo is unusable / no reliable diagnosis (online
 * path only). Forces a retake — there is no "use anyway" override, so junk
 * diagnoses never reach the outbreak map.
 */
export function RetakeScreen({ image, guidance, onRetake }: Props) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <AnimatedView entering={FadeIn.duration(400)} className="items-center">
            <View
              className="overflow-hidden rounded-3xl"
              style={{ width: 160, height: 160, opacity: 0.7 }}
            >
              <Image
                source={{ uri: image.uri }}
                style={{ width: 160, height: 160 }}
                contentFit="cover"
              />
            </View>
            <View
              className="items-center justify-center rounded-2xl bg-warning-tint"
              style={{ width: 56, height: 56, marginTop: -28 }}
            >
              <RefreshCw size={26} color={palette.status.warning} strokeWidth={2.4} />
            </View>
          </AnimatedView>

          <AnimatedView
            entering={FadeInDown.delay(100).duration(400)}
            className="items-center gap-2"
          >
            <Text className="text-xl font-extrabold text-text">Let&apos;s try that again</Text>
            <Text className="text-center text-sm text-text-muted">{guidance}</Text>
          </AnimatedView>
        </View>

        <BottomActionBar>
          <Button
            label="Retake photo"
            variant="gradient"
            size="lg"
            onPress={onRetake}
            leftSlot={<CameraIcon size={18} color="#ffffff" strokeWidth={2.4} />}
          />
        </BottomActionBar>
      </SafeAreaView>
    </View>
  );
}
