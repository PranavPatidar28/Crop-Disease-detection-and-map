import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Loader } from '@/components/ui/loader';
import { Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
}

/**
 * Step 2 of the report flow. Shows a thumbnail of the captured image and
 * a brand-tinted spinner while the engine chain (cloud → on-device → manual)
 * resolves. The subtitle is intentionally optimistic about the cloud model;
 * if cloud fails and on-device runs, the result usually arrives before the
 * subtitle becomes misleading.
 */
export function AnalyzingScreen({ image }: Props) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View className="flex-row items-center justify-center px-4 py-2">
          <Text className="text-xs font-bold uppercase tracking-[1.4px] text-brand-700">
            Step 2 of 4
          </Text>
        </View>

        <View className="flex-1 items-center justify-center gap-5 px-6">
          <Animated.View
            entering={FadeIn.duration(300)}
            className="overflow-hidden rounded-2xl border border-border"
          >
            <Image
              source={{ uri: image.uri }}
              style={{ width: 140, height: 140 }}
              contentFit="cover"
            />
          </Animated.View>
          <Loader size={56} />
          <View className="items-center gap-1">
            <Text className="text-base font-bold text-text">Analyzing your photo</Text>
            <Text className="text-center text-sm text-text-muted">
              Using our high-accuracy cloud model…
            </Text>
          </View>
          <Card padding="sm" className="self-stretch">
            <View className="gap-1">
              <Text className="text-xs text-text-muted">✓ Image quality good</Text>
              <Text className="text-xs text-text-muted">✓ Leaf detected</Text>
              <Text className="text-xs text-text-muted">● Identifying disease…</Text>
            </View>
          </Card>
        </View>
      </SafeAreaView>
    </View>
  );
}
