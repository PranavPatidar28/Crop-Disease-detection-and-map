import { Check } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import type { DropdownOption } from './types';

interface DropdownOptionRowProps<T> {
  option: DropdownOption<T>;
  selected: boolean;
  /** Hide the trailing check (menu mode). */
  showCheck: boolean;
  onPress: () => void;
}

export function DropdownOptionRow<T>({
  option,
  selected,
  showCheck,
  onPress,
}: DropdownOptionRowProps<T>) {
  const { label, description, icon: Icon, destructive, disabled } = option;

  const iconColor = destructive
    ? palette.status.danger
    : palette.brand[600];

  return (
    <PressableScale
      accessibilityRole={showCheck ? 'button' : 'menuitem'}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic={disabled ? 'none' : 'selection'}
      pressedScale={0.98}
    >
      <View
        className={cn(
          'min-h-11 flex-row items-center gap-3 rounded-lg px-3 py-2.5',
          selected && showCheck && 'bg-brand-50',
          disabled && 'opacity-50',
        )}
      >
        {Icon ? (
          <Icon size={18} color={iconColor} strokeWidth={2.2} />
        ) : null}

        <View className="flex-1">
          <Text
            className={cn(
              'text-sm font-bold',
              destructive ? 'text-danger' : 'text-text',
            )}
            numberOfLines={1}
          >
            {label}
          </Text>
          {description ? (
            <Text className="text-xs text-text-subtle" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>

        {showCheck && selected ? (
          <Check size={16} color={palette.brand[600]} strokeWidth={2.6} />
        ) : null}
      </View>
    </PressableScale>
  );
}
