import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

import { IconButton } from '@/components/ui/icon-button';
import { palette } from '@/theme/colors';

export interface BackButtonProps {
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
  testID?: string;
}

/**
 * Standard circular back affordance. Previously every screen rolled its own —
 * some a bare "‹ Back" text link, some a circular icon — which read as
 * inconsistent. This unifies them on the chevron IconButton and falls back to
 * `router.back()` when no handler is supplied.
 */
export function BackButton({
  onPress,
  accessibilityLabel = 'Go back',
  className,
  testID,
}: BackButtonProps) {
  return (
    <IconButton
      accessibilityLabel={accessibilityLabel}
      icon={<ChevronLeft size={20} color={palette.brand[700]} strokeWidth={2.4} />}
      onPress={onPress ?? (() => router.back())}
      variant="surface"
      size="md"
      className={className}
      testID={testID}
    />
  );
}
