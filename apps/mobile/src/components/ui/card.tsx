import { type ReactNode } from 'react';
import { type ViewStyle } from 'react-native';

import { View } from '@/tw';
import { shadows, type ShadowToken } from '@/theme/shadows';
import { cn } from '@/utils/cn';

type Variant = 'flat' | 'elevated' | 'outlined';

const variantClasses: Record<Variant, string> = {
  flat: 'bg-surface',
  elevated: 'bg-surface-elevated',
  outlined: 'bg-bg border border-border',
};

export interface CardProps {
  children: ReactNode;
  variant?: Variant;
  shadow?: ShadowToken;
  className?: string;
  style?: ViewStyle;
}

export function Card({
  children,
  variant = 'flat',
  shadow = 'none',
  className,
  style,
}: CardProps) {
  return (
    <View
      className={cn('rounded-2xl p-4', variantClasses[variant], className)}
      style={[shadows[shadow], style]}
    >
      {children}
    </View>
  );
}
