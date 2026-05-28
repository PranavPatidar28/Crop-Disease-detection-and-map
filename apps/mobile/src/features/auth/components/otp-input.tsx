import { useEffect, useRef } from 'react';
import { type TextInput as RNTextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text, TextInput, View } from '@/tw';
import { useTheme } from '@/hooks/use-theme';

const CELL_COUNT = 6;

export interface OtpInputProps {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChangeText,
  error,
  onComplete,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<RNTextInput>(null);
  const theme = useTheme();
  const shake = useSharedValue(0);

  useEffect(() => {
    if (autoFocus) {
      const id = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [autoFocus]);

  useEffect(() => {
    if (error) {
      // 4-leg shake — feels heftier than the prior single-bounce pattern
      shake.value = withSequence(
        withTiming(-1, { duration: 60 }),
        withTiming(1, { duration: 60 }),
        withTiming(-0.5, { duration: 50 }),
        withSpring(0, { stiffness: 320, damping: 10 }),
      );
    }
  }, [error, shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value * 12 }],
  }));

  const handleChange = (next: string) => {
    const digits = next.replace(/\D/gu, '').slice(0, CELL_COUNT);
    onChangeText(digits);
    if (digits.length === CELL_COUNT) onComplete?.(digits);
  };

  const cells = Array.from({ length: CELL_COUNT }, (_, i) => i);

  return (
    <View className="gap-2">
      <Animated.View style={animatedStyle}>
        <View
          accessibilityRole="text"
          className="flex-row items-center justify-between"
        >
          {cells.map((i) => (
            <OtpCell
              key={i}
              char={value[i] ?? ''}
              isFocused={value.length === i}
              hasError={!!error}
            />
          ))}
        </View>
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={CELL_COUNT}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        caretHidden
        selectionColor={theme.primary}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          opacity: 0,
          color: 'transparent',
        }}
      />
      {error ? <Text className="ml-1 text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

interface OtpCellProps {
  char: string;
  isFocused: boolean;
  hasError: boolean;
}

/**
 * Single OTP cell. Springs to a slightly larger scale when it accepts a digit
 * and pulses the border when it becomes the focused cell — both signals make
 * autofill on Android feel less abrupt.
 */
function OtpCell({ char, isFocused, hasError }: OtpCellProps) {
  const isFilled = !!char;
  const fillScale = useSharedValue(0);
  const focusGlow = useSharedValue(0);

  useEffect(() => {
    if (isFilled) {
      // Briefly overshoot to 1.06 then settle
      fillScale.value = withSequence(
        withTiming(1, { duration: 80 }),
        withSpring(1, { stiffness: 320, damping: 12, mass: 0.5 }),
      );
    } else {
      fillScale.value = withTiming(0, { duration: 120 });
    }
  }, [fillScale, isFilled]);

  useEffect(() => {
    focusGlow.value = withTiming(isFocused && !hasError ? 1 : 0, { duration: 200 });
  }, [focusGlow, isFocused, hasError]);

  const charStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + fillScale.value * 0.3 }],
    opacity: fillScale.value,
  }));

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focusGlow.value * 0.04 }],
  }));

  return (
    <Animated.View style={cellStyle}>
      <View
        className={`h-14 w-12 items-center justify-center rounded-2xl ${
          hasError
            ? 'border-2 border-danger bg-surface'
            : isFilled
              ? 'border-2 border-brand-600 bg-brand-50'
              : isFocused
                ? 'border-2 border-brand-600 bg-surface'
                : 'border border-border bg-surface'
        }`}
      >
        <Animated.View style={charStyle}>
          <Text className="text-2xl font-bold text-text">{char || ' '}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
