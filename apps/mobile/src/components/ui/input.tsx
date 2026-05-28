import { forwardRef, useState } from 'react';
import { type TextInput as RNTextInput } from 'react-native';

import { Text, TextInput, View } from '@/tw';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

export interface InputProps {
  label?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'email-address' | 'numeric';
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  editable?: boolean;
  multiline?: boolean;
  className?: string;
  testID?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

export const Input = forwardRef<RNTextInput, InputProps>(function Input(
  {
    label,
    placeholder,
    helper,
    error,
    value,
    onChangeText,
    secureTextEntry,
    autoCapitalize = 'sentences',
    keyboardType = 'default',
    leftSlot,
    rightSlot,
    editable = true,
    multiline,
    className,
    testID,
    onBlur,
    onFocus,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const theme = useTheme();
  const hasError = !!error;

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text className="text-sm font-medium text-text-muted">{label}</Text>
      ) : null}

      <View
        className={cn(
          'flex-row items-center rounded-xl border bg-surface px-3',
          multiline ? 'min-h-24 py-3 items-start' : 'h-12',
          focused && !hasError && 'border-brand-500',
          !focused && !hasError && 'border-border',
          hasError && 'border-danger',
          !editable && 'opacity-60',
        )}
      >
        {leftSlot ? <View className="mr-2">{leftSlot}</View> : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSubtle}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          testID={testID}
          className="flex-1 text-base text-text"
          style={{ color: theme.text }}
        />

        {rightSlot ? <View className="ml-2">{rightSlot}</View> : null}
      </View>

      {hasError ? (
        <Text className="text-xs text-danger">{error}</Text>
      ) : helper ? (
        <Text className="text-xs text-text-subtle">{helper}</Text>
      ) : null}
    </View>
  );
});
