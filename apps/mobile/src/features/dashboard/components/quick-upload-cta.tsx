import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTranslation } from '@/i18n';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

export function QuickUploadCTA() {
  const { t } = useTranslation();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t('dashboard.reportDisease')}
      onPress={() => router.push('/report')}
      haptic="light"
      pressedScale={0.97}
      className="overflow-hidden rounded-2xl"
      style={{
        shadowColor: palette.brand[600],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 16,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[palette.brand[500], palette.brand[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-row items-center justify-between gap-3 px-5 py-4">
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-extrabold text-white">{t('dashboard.reportDisease')}</Text>
          <Text className="text-xs font-medium text-white/80">{t('dashboard.cameraAi')}</Text>
        </View>
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/20">
          <Camera size={22} color="#ffffff" strokeWidth={2.2} />
        </View>
      </View>
    </PressableScale>
  );
}
