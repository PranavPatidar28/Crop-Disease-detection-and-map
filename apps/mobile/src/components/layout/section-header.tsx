import { type ReactNode } from 'react';

import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, trailing, className }: SectionHeaderProps) {
  return (
    <View className={cn('flex-row items-end justify-between gap-3', className)}>
      <View className="flex-1 gap-0.5">
        <Text className="text-xl font-semibold text-text">{title}</Text>
        {subtitle ? <Text className="text-sm text-text-muted">{subtitle}</Text> : null}
      </View>
      {trailing ? <View>{trailing}</View> : null}
    </View>
  );
}
