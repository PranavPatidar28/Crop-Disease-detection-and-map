import { GlassView } from 'expo-glass-effect';
import { Platform, type ViewStyle } from 'react-native';

import { View } from '@/tw';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

/**
 * Glass-effect card used by auth screens. Falls back to a tinted elevated
 * surface on platforms where the liquid-glass effect isn't available.
 */
export function AuthCard({ children, className, style }: AuthCardProps) {
  const theme = useTheme();
  const tint = Platform.OS === 'ios' ? `${theme.surfaceElevated}99` : theme.surfaceElevated;

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={tint}
      style={[
        {
          borderRadius: 28,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        className={cn('rounded-[28px] border border-white/10 p-6', className)}
        style={{
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : `${theme.surfaceElevated}E6`,
        }}
      >
        {children}
      </View>
    </GlassView>
  );
}
