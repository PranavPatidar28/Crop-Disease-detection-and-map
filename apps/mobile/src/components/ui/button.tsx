import { forwardRef } from 'react';
import { ActivityIndicator } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const containerVariants: Record<Variant, string> = {
  primary: 'bg-brand-600',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
  destructive: 'bg-danger',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-text-inverse',
  secondary: 'text-text',
  ghost: 'text-text',
  destructive: 'text-text-inverse',
};

const sizeContainer: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-lg',
  md: 'h-11 px-4 rounded-xl',
  lg: 'h-14 px-5 rounded-2xl',
};

const sizeLabel: Record<Size, string> = {
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
};

export interface ButtonProps {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
  /** When true (default), fires a selection haptic on press-in. */
  haptic?: boolean;
  testID?: string;
}

/**
 * The standard tap target. Switched from TouchableOpacity → PressableScale so the
 * tap feedback is a spring-driven scale (UI thread) instead of an opacity dip.
 * Destructive variant gets a slightly heavier haptic to nudge confirmation intent.
 */
export const Button = forwardRef<React.ComponentRef<typeof PressableScale>, ButtonProps>(
  function Button(
    {
      label,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      onPress,
      leftSlot,
      rightSlot,
      className,
      haptic = true,
      testID,
    },
    ref,
  ) {
    const isDisabled = disabled || loading;
    const hapticIntensity = !haptic
      ? 'none'
      : variant === 'destructive'
        ? 'medium'
        : variant === 'primary'
          ? 'light'
          : 'selection';

    return (
      <PressableScale
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        haptic={hapticIntensity}
        pressedScale={size === 'lg' ? 0.97 : 0.96}
        testID={testID}
        className={cn(
          'flex-row items-center justify-center gap-2',
          containerVariants[variant],
          sizeContainer[size],
          isDisabled && 'opacity-50',
          className,
        )}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'destructive' ? '#fff' : '#0b1220'}
          />
        ) : (
          <>
            {leftSlot ? <View className="mr-1">{leftSlot}</View> : null}
            <Text className={cn(sizeLabel[size], labelVariants[variant])}>{label}</Text>
            {rightSlot ? <View className="ml-1">{rightSlot}</View> : null}
          </>
        )}
      </PressableScale>
    );
  },
);
