import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { User } from '@/types/user';

import { useGreeting } from '../hooks/use-greeting';

interface GreetingHeaderProps {
  user: User | null;
  onPressAvatar?: () => void;
}

export function GreetingHeader({ user, onPressAvatar }: GreetingHeaderProps) {
  const theme = useTheme();
  const greeting = useGreeting();

  const displayName = user?.name ?? 'Farmer';
  const location =
    [user?.district, user?.state].filter(Boolean).join(', ') || 'Set your location';

  return (
    <View className="overflow-hidden rounded-[28px]">
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View className="p-5 pb-6">
        <Animated.View entering={FadeIn.duration(400)}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 gap-1">
              <Text className="text-xs font-medium uppercase tracking-wider text-white/60">
                {greeting}
              </Text>
              <Text className="text-2xl font-bold text-white" numberOfLines={1}>
                {displayName}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={onPressAvatar}
              haptic="selection"
              pressedScale={0.9}
            >
              <Avatar name={user?.name} fallback="🌾" size="md" />
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <GlassView
            glassEffectStyle="regular"
            tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.12)' : `${theme.surfaceElevated}AA`}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 16 }}
          >
            <View className="flex-row items-center gap-2 rounded-2xl border border-white/15 px-3 py-2.5">
              <Text className="text-base">📍</Text>
              <Text className="flex-1 text-sm font-medium text-white" numberOfLines={1}>
                {location}
              </Text>
              <Text className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                LIVE
              </Text>
              <View className="h-2 w-2 rounded-full bg-success" />
            </View>
          </GlassView>
        </Animated.View>
      </View>
    </View>
  );
}
