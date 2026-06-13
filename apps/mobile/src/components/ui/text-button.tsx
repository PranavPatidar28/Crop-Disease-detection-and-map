import { forwardRef, type ReactNode } from 'react';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

type Tone = 'brand' | 'muted' | 'danger' | 'warning';
type Size = 'sm' | 'md';

export interface TextButtonProps {
  label: string;
  onPress?: () => void;
  tone?: Tone;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  haptic?: 'none' | 'selection' | 'light' | 'medium' | 'heavy';
  className?: string;
  testID?: string;
}

const toneText: Record<Tone, string> = {
  brand: 'text-brand-700',
  muted: 'text-text-faint',
  danger: 'text-danger',
  warning: 'text-warning',
};

const sizeText: Record<Size, string> = {
  sm: 'text-xs font-bold',
  md: 'text-sm font-bold',
};

/**
 * Inline, low-emphasis text action — "Resend code", "Mark all read", "Re-run".
 * Replaces bare `<Pressable><Text/></Pressable>` patterns: adds a tactile scale
 * spring, a generous hitSlop so the small text still meets the 44pt touch
 * target, and a disabled treatment that dims to the muted tone.
 */
export const TextButton = forwardRef<
  React.ComponentRef<typeof PressableScale>,
  TextButtonProps
>(function TextButton(
  {
    label,
    onPress,
    tone = 'brand',
    size = 'md',
    disabled = false,
    loading = false,
    leftSlot,
    rightSlot,
    haptic = 'selection',
    className,
    testID,
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      haptic={haptic}
      pressedScale={0.94}
      hitSlop={10}
      testID={testID}
      className={cn('self-start', className)}
    >
      <View className="flex-row items-center gap-1">
        {leftSlot}
        <Text className={cn(sizeText[size], isDisabled ? toneText.muted : toneText[tone])}>
          {label}
        </Text>
        {rightSlot}
      </View>
    </PressableScale>
  );
});
