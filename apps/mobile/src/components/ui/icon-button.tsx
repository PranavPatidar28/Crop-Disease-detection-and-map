import { forwardRef, type ReactNode } from 'react';

import { PressableScale } from '@/components/ui/pressable-scale';
import { View } from '@/tw';
import { cn } from '@/utils/cn';

type Variant = 'surface' | 'ghost' | 'tint';
type Size = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  haptic?: 'none' | 'selection' | 'light' | 'medium' | 'heavy';
  className?: string;
  testID?: string;
}

/** Visual box size per size token. Hit area is always >= 44pt via hitSlop padding. */
const sizeBox: Record<Size, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const variantClasses: Record<Variant, string> = {
  surface: 'border border-border bg-surface',
  ghost: 'bg-transparent',
  tint: 'bg-brand-50',
};

/**
 * Circular icon-only button used for back/close/overflow/floating controls.
 * Replaces the ad-hoc `<PressableScale className="h-10 w-10 ...">` blocks that
 * were duplicated across screens. Guarantees a >= 44pt touch target via hitSlop
 * even when the visual box is smaller.
 */
export const IconButton = forwardRef<
  React.ComponentRef<typeof PressableScale>,
  IconButtonProps
>(function IconButton(
  {
    icon,
    onPress,
    accessibilityLabel,
    variant = 'surface',
    size = 'md',
    disabled = false,
    haptic = 'selection',
    className,
    testID,
  },
  ref,
) {
  // Expand the touch target to >=44pt regardless of visual box size.
  const boxPx = size === 'sm' ? 36 : size === 'md' ? 40 : 48;
  const slop = Math.max(0, Math.ceil((44 - boxPx) / 2));

  return (
    <PressableScale
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic={haptic}
      pressedScale={0.92}
      hitSlop={slop}
      testID={testID}
      className={cn(disabled && 'opacity-40', className)}
    >
      <View
        className={cn(
          'items-center justify-center rounded-full',
          sizeBox[size],
          variantClasses[variant],
        )}
      >
        {icon}
      </View>
    </PressableScale>
  );
});
