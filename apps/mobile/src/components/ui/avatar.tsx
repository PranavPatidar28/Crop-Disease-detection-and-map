import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';
import { cn } from '@/utils/cn';

export interface AvatarProps {
  name?: string | null;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** When true, draws a thin success ring around the avatar. */
  verified?: boolean;
  className?: string;
}

const sizeClass: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
  xl: 'h-16 w-16',
};

const textClass: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-2xl',
};

function getInitials(name?: string | null, fallback = '?'): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/u).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback;
}

/**
 * Soft Sage gradient avatar. Initials only — image upload not in scope.
 * `verified` adds a thin success-tinted ring.
 */
export function Avatar({ name, fallback, size = 'md', verified, className }: AvatarProps) {
  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        sizeClass[size],
        verified && 'border-2 border-success',
        className,
      )}
    >
      <LinearGradient
        colors={[palette.brand[400], palette.brand[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text className={cn('font-bold text-white', textClass[size])}>
        {getInitials(name, fallback)}
      </Text>
    </View>
  );
}
