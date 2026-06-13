import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui/loader';
import { Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
}

const STATUS_COPY = [
  'Uploading photo…',
  'Detecting crop…',
  'Checking for disease…',
  'Preparing advisory…',
];

const COLD_START_AFTER_MS = 6000;

/**
 * Loading screen shown while the report is uploaded and analyzed. Rotates
 * honest status copy and, after a few seconds with no result, surfaces a
 * cold-start note (the HF space may be waking up).
 */
export function AnalyzingScreen({ image }: Props) {
  const [copyIndex, setCopyIndex] = useState(0);
  const [coldStart, setColdStart] = useState(false);

  useEffect(() => {
    const rotate = setInterval(() => {
      setCopyIndex((i) => (i + 1) % STATUS_COPY.length);
    }, 1800);
    const cold = setTimeout(() => setColdStart(true), COLD_START_AFTER_MS);
    return () => {
      clearInterval(rotate);
      clearTimeout(cold);
    };
  }, []);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <View className="overflow-hidden rounded-3xl" style={{ width: 180, height: 180 }}>
            <Image source={{ uri: image.uri }} style={{ width: 180, height: 180 }} contentFit="cover" />
          </View>
          <Loader size={40} />
          <Animated.View key={copyIndex} entering={FadeIn.duration(300)} accessibilityLiveRegion="polite">
            <Text className="text-center text-base font-bold text-text">{STATUS_COPY[copyIndex]}</Text>
          </Animated.View>
          {coldStart ? (
            <Text className="text-center text-sm text-text-muted">
              The AI is waking up — this can take a moment the first time.
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
