import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
}

/**
 * Big primary CTA used on auth + onboarding. Uses spring-scale on press for a
 * tactile response, with a soft inner highlight that gives the gradient depth.
 */
export function GradientButton({
  label,
  onPress,
  loading,
  disabled,
  className,
  style,
}: GradientButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      haptic="light"
      pressedScale={0.97}
      style={[
        {
          borderRadius: 16,
          overflow: 'hidden',
          opacity: isDisabled ? 0.5 : 1,
          shadowColor: palette.brand[500],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.32,
          shadowRadius: 16,
          elevation: 6,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[palette.brand[400], palette.brand[600], palette.brand[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.55, 1]}
      >
        {/* Soft top highlight — adds depth without a second draw call */}
        <LinearGradient
          colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }}
        />
        <View className={cn('h-14 flex-row items-center justify-center gap-2 px-5', className)}>
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-base font-semibold text-white">{label}</Text>
          )}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}
