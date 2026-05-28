import { ActivityIndicator } from 'react-native';

import { Text, View } from '@/tw';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export interface LoaderProps {
  label?: string;
  size?: 'small' | 'large';
  fullscreen?: boolean;
  className?: string;
}

export function Loader({ label, size = 'large', fullscreen, className }: LoaderProps) {
  const theme = useTheme();

  return (
    <View
      className={cn(
        'items-center justify-center gap-3',
        fullscreen && 'absolute inset-0 bg-bg/70',
        !fullscreen && 'p-4',
        className,
      )}
    >
      <ActivityIndicator size={size} color={theme.primary} />
      {label ? <Text className="text-sm text-text-muted">{label}</Text> : null}
    </View>
  );
}
