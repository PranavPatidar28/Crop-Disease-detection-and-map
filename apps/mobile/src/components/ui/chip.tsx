import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';
import { cn } from '@/utils/cn';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface ChipProps {
  label: string;
  active?: boolean;
  tone?: Tone;
  onPress?: () => void;
  leftSlot?: ReactNode;
  className?: string;
}

const toneInactive: Record<Tone, string> = {
  neutral: 'bg-surface border border-border',
  brand: 'bg-brand-50 border border-brand-100',
  success: 'bg-success-tint border border-success-tint',
  warning: 'bg-warning-tint border border-warning-tint',
  danger: 'bg-danger-tint border border-danger-tint',
  info: 'bg-info-tint border border-info-tint',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-text-muted',
  brand: 'text-brand-700',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/**
 * Pill / chip used for filters, severity badges, and small status indicators.
 * Active state always uses the brand gradient regardless of tone (this is what
 * "selected" means visually).
 */
export function Chip({ label, active = false, tone = 'neutral', onPress, leftSlot, className }: ChipProps) {
  const baseClass = cn(
    'flex-row items-center gap-1 rounded-full px-3 py-1.5',
    !active && toneInactive[tone],
    className,
  );

  const labelClass = cn(
    'text-xs font-bold',
    active ? 'text-white' : toneText[tone],
  );

  if (active) {
    return (
      <PressableScale onPress={onPress} disabled={!onPress} pressedScale={0.96} haptic="selection">
        <View className={cn(baseClass, 'overflow-hidden')}>
          <LinearGradient
            colors={[palette.brand[500], palette.brand[600]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
          {leftSlot}
          <Text className={labelClass}>{label}</Text>
        </View>
      </PressableScale>
    );
  }

  if (!onPress) {
    return (
      <View className={baseClass}>
        {leftSlot}
        <Text className={labelClass}>{label}</Text>
      </View>
    );
  }

  return (
    <PressableScale onPress={onPress} pressedScale={0.96} haptic="selection">
      <View className={baseClass}>
        {leftSlot}
        <Text className={labelClass}>{label}</Text>
      </View>
    </PressableScale>
  );
}
