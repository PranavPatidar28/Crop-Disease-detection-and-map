import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';
import { cn } from '@/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Soft Sage empty state — glow tile + title + sub + optional ghost CTA.
 */
export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn('items-center gap-3 px-6 py-12', className)}
    >
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface">
        <LinearGradient
          pointerEvents="none"
          colors={[`${palette.brand[400]}33`, 'transparent']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.9, y: 0.9 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        {icon ?? <Text className="text-3xl">{emoji ?? '🌾'}</Text>}
      </View>
      <Text className="text-center text-base font-bold text-text">{title}</Text>
      {description ? (
        <Text className="max-w-[260px] text-center text-sm leading-5 text-text-muted">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="ghost"
          size="sm"
          onPress={onAction}
          fullWidth={false}
          className="mt-2"
        />
      ) : null}
    </View>
  );
}
