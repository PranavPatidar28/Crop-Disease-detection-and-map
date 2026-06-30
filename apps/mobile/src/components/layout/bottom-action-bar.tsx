import { type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { cn } from '@/utils/cn';

export interface BottomActionBarProps {
  children: ReactNode;
  /** Lay the actions out in a row instead of stacked. */
  row?: boolean;
  /** Hairline top divider + surface background. Defaults to true. */
  divider?: boolean;
  /** Override the inner gap between stacked/row actions. */
  gapClassName?: string;
  className?: string;
}

/**
 * Pinned bottom action bar for screen-level primary CTAs ("Confirm & submit",
 * "Continue", etc.).
 *
 * Why this exists: footers were hand-rolled per screen with arbitrary bottom
 * padding (`pb-3`, `pb-4`) and, in some cases, a SafeAreaView that excluded the
 * `bottom` edge — so the button collided with the home indicator / gesture bar
 * and looked cramped. This component owns the bottom safe-area inset itself
 * (clamped to a comfortable minimum), so screens should drop `'bottom'` from
 * their SafeAreaView edges and let the bar handle it.
 */
const MIN_BOTTOM_PADDING = 14;

export function BottomActionBar({
  children,
  row = false,
  divider = true,
  gapClassName = 'gap-2',
  className,
}: BottomActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className={cn('px-4 pt-3', divider && 'border-t border-border bg-surface', className)}
      style={{ paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_PADDING) }}
    >
      <View className={cn(gapClassName, row && 'flex-row items-center')}>{children}</View>
    </View>
  );
}
