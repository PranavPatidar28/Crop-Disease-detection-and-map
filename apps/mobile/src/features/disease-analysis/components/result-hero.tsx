import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';
import { severityVisuals } from '@/utils/severity';

interface ResultHeroProps {
  imageUrl: string;
  cropType: string;
  severity?: Severity | null;
}

export function ResultHero({ imageUrl, cropType, severity }: ResultHeroProps) {
  const visuals = severityVisuals(severity);

  return (
    <View className="overflow-hidden rounded-3xl">
      <Image
        source={{ uri: imageUrl }}
        style={{ width: '100%', aspectRatio: 1 }}
        contentFit="cover"
        transition={200}
      />

      {/* severity strip on top */}
      <View
        className="absolute left-0 right-0 top-0 h-1.5"
        style={{ backgroundColor: visuals.rawColor }}
      />

      <LinearGradient
        colors={['transparent', 'rgba(11,18,32,0.85)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '55%',
        }}
      />

      <View className="absolute bottom-0 left-0 right-0 p-4">
        <Text className="text-[11px] font-medium uppercase tracking-wider text-white/70">
          Crop
        </Text>
        <Text className="text-xl font-bold text-white">{cropType}</Text>
      </View>

      {/* corner accent */}
      <View
        className="absolute"
        style={{
          top: 12,
          right: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: 'rgba(11,18,32,0.55)',
        }}
      >
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-white">
          AI · Diagnosis
        </Text>
      </View>

      {/* small brand badge bottom-right */}
      <View
        className="absolute"
        style={{
          bottom: 14,
          right: 14,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: `${palette.brand[500]}33`,
          borderWidth: 1,
          borderColor: `${palette.brand[400]}55`,
        }}
      >
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-brand-200">
          Predicted
        </Text>
      </View>
    </View>
  );
}
