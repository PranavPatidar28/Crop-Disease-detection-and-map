import { ChevronDown } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import type { TriggerVariant } from './types';

interface DropdownTriggerProps {
  variant: TriggerVariant;
  /** Field label (uppercase) / pill text. */
  label?: string;
  /** Resolved display text (selected option label or placeholder). */
  displayText: string;
  /** Whether a value is currently set (drives pill active state). */
  hasValue: boolean;
  /** Leading icon for the selected value (field/pill). */
  icon?: LucideIcon;
  expanded: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  testID?: string;
  onPress: () => void;
}

export function DropdownTrigger({
  variant,
  label,
  displayText,
  hasValue,
  icon: Icon,
  expanded,
  disabled,
  error,
  className,
  testID,
  onPress,
}: DropdownTriggerProps) {
  const theme = useTheme();
  const hasError = !!error;

  if (variant === 'pill') {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label ?? displayText}
        accessibilityState={{ expanded, disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        haptic="selection"
        pressedScale={0.97}
        testID={testID}
        className={cn('flex-1', className)}
      >
        <View
          className={cn(
            'flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5',
            hasValue ? 'border-brand-600 bg-brand-600' : 'border-border bg-surface',
            disabled && 'opacity-50',
          )}
        >
          {Icon ? (
            <Icon
              size={14}
              color={hasValue ? '#fff' : palette.brand[600]}
              strokeWidth={2.2}
            />
          ) : null}
          <Text
            className={cn('text-[13px] font-bold', hasValue ? 'text-white' : 'text-text')}
            numberOfLines={1}
          >
            {/* Pill shows the selected value's label, or the category name when empty. */}
            {hasValue ? displayText : (label ?? displayText)}
          </Text>
          <ChevronDown size={14} color={hasValue ? '#fff' : theme.textMuted} strokeWidth={2.2} />
        </View>
      </PressableScale>
    );
  }

  // variant === 'field'
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label ?? displayText}
      accessibilityState={{ expanded, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      testID={testID}
      className={cn('gap-1.5', className)}
    >
      {label ? (
        <Text className="text-xs font-bold uppercase tracking-[1.4px] text-text-subtle">
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          'h-12 flex-row items-center rounded-xl border bg-surface px-3',
          hasError ? 'border-danger' : expanded ? 'border-2 border-brand-600' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        {Icon ? (
          <View className="mr-2">
            <Icon size={18} color={palette.brand[600]} strokeWidth={2.2} />
          </View>
        ) : null}
        <Text
          className={cn('flex-1 text-base', hasValue ? 'text-text' : 'text-text-faint')}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronDown size={18} color={theme.textMuted} strokeWidth={2.2} />
      </View>
      {hasError ? <Text className="text-xs font-medium text-danger">{error}</Text> : null}
    </PressableScale>
  );
}
