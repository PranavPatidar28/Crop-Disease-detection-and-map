import { Pressable, Text, TextInput, View } from '@/tw';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export interface PhoneInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
  className?: string;
}

/**
 * Indian phone input. The country selector is intentionally non-functional in
 * v2 — only +91 is supported. The selector is shown as visual polish.
 */
export function PhoneInput({
  value,
  onChangeText,
  error,
  onSubmitEditing,
  className,
}: PhoneInputProps) {
  const theme = useTheme();
  const hasError = !!error;

  const handleChange = (next: string) => {
    const digits = next.replace(/\D/gu, '').slice(0, 10);
    onChangeText(digits);
  };

  return (
    <View className={cn('gap-1.5', className)}>
      <View
        className={cn(
          'h-14 flex-row items-center overflow-hidden rounded-xl border bg-surface px-1',
          hasError ? 'border-danger' : 'border-border',
        )}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Country code (India)"
          className="h-12 flex-row items-center gap-1.5 rounded-lg bg-brand-50 px-3"
          disabled
        >
          <Text className="text-base">🇮🇳</Text>
          <Text className="text-base font-bold text-text">+91</Text>
        </Pressable>

        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder="98765 43210"
          placeholderTextColor={theme.textFaint}
          keyboardType="phone-pad"
          maxLength={10}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="next"
          className="ml-2 flex-1 text-lg tracking-wider text-text"
          style={{ color: theme.text }}
        />
      </View>
      {hasError ? <Text className="ml-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
