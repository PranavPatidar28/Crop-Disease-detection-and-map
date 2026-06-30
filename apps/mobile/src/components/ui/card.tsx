import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import { View } from '@/tw';
import { palette } from '@/theme/colors';
import { shadows, type ShadowToken } from '@/theme/shadows';
import { cn } from '@/utils/cn';

type Variant = 'flat' | 'elevated' | 'outlined' | 'glow';

const variantClasses: Record<Variant, string> = {
  flat: 'bg-surface border border-border',
  elevated: 'bg-surface border border-border',
  outlined: 'bg-bg border border-border',
  glow: 'bg-surface border border-border overflow-hidden',
};

export interface CardProps {
  children: ReactNode;
  variant?: Variant;
  shadow?: ShadowToken;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: ViewStyle;
}

const padClass = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

/**
 * Soft Sage card.
 * Use `glow` for hero data cards (subtle brand-tinted radial highlight in
 * the background). Otherwise use `flat`.
 */
export function Card({
  children,
  variant = 'flat',
  shadow = 'card',
  padding = 'md',
  className,
  style,
}: CardProps) {
  return (
    <View
      className={cn('rounded-xl', variantClasses[variant], padClass[padding], className)}
      style={[shadows[shadow], style]}
    >
      {variant === 'glow' ? (
        <LinearGradient
          pointerEvents="none"
          colors={[`${palette.brand[400]}26`, 'transparent']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.85, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View>{children}</View>
    </View>
  );
}
