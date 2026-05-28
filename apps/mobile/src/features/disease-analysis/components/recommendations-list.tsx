import { GlassView } from 'expo-glass-effect';
import { Sparkles } from 'lucide-react-native';
import { Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

interface RecommendationsListProps {
  items: string[];
}

export function RecommendationsList({ items }: RecommendationsListProps) {
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated}
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <View className="rounded-[20px] border border-white/10 p-4">
          <Text className="text-sm text-text-muted">
            No recommendations available yet. Re-run analysis to get suggestions.
          </Text>
        </View>
      </GlassView>
    );
  }

  return (
    <View className="gap-2">
      {items.map((text, idx) => (
        <Animated.View key={idx} entering={FadeInDown.delay(80 * idx).duration(360)}>
          <GlassView
            glassEffectStyle="regular"
            tintColor={
              Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated
            }
            style={{ borderRadius: 20, overflow: 'hidden' }}
          >
            <View className="flex-row items-start gap-3 rounded-[20px] border border-white/10 p-3">
              <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-2xl bg-brand-500/15">
                <Sparkles size={16} color={palette.brand[300]} strokeWidth={2.2} />
              </View>
              <Text className="flex-1 text-sm leading-5 text-text">{text}</Text>
            </View>
          </GlassView>
        </Animated.View>
      ))}
    </View>
  );
}
