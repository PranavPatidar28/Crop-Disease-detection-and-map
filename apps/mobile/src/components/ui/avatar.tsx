import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface AvatarProps {
  name?: string | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClass: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

const textClass: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
};

function getInitials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/u).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

/**
 * Initials-only avatar (image upload comes later). Themed via brand-500/20
 * + brand-200 text so it reads on both light and dark surfaces.
 */
export function Avatar({ name, fallback, size = 'md', className }: AvatarProps) {
  return (
    <View
      className={cn(
        'items-center justify-center rounded-full bg-brand-500/20',
        sizeClass[size],
        className,
      )}
    >
      <Text className={cn('font-semibold text-brand-300', textClass[size])}>
        {getInitials(name, fallback)}
      </Text>
    </View>
  );
}
