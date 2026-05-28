import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type HapticIntensity = 'none' | 'selection' | 'light' | 'medium' | 'heavy';

export interface PressableScaleProps
  extends Omit<PressableProps, 'style' | 'onPressIn' | 'onPressOut'> {
  /** Scale value at full press. 0.96 reads as a confident tap; 0.92 as a button-like press. */
  pressedScale?: number;
  /** Springy scale animation tuned to feel ~120ms on each leg. */
  haptic?: HapticIntensity;
  /** Disable scale + haptic (still passes through onPress). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
}

/**
 * Premium tap surface — replaces ad-hoc `style={({ pressed }) => ({ opacity })}` patterns
 * with a tactile scale-down spring driven on the UI thread (Reanimated 4 worklet).
 *
 * Why a spring over timing: a touch interaction reads more "natural" with a slight
 * settle on release; opacity-only press states feel cheap on premium UIs.
 *
 * Haptics fire on press-in (the moment of intent), not on press-out, matching iOS
 * system buttons. `none` skips them entirely (e.g. for nested taps inside a parent
 * that already vibrates).
 */
export const PressableScale = forwardRef<
  React.ComponentRef<typeof Pressable>,
  PressableScaleProps
>(function PressableScale(
  {
    pressedScale = 0.96,
    haptic = 'selection',
    flat = false,
    style,
    children,
    disabled,
    onPressIn,
    onPressOut,
    ...rest
  },
  ref,
) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      if (!flat && !disabled) {
        scale.value = withSpring(pressedScale, {
          damping: 18,
          stiffness: 320,
          mass: 0.6,
        });
        if (haptic !== 'none') {
          fireHaptic(haptic);
        }
      }
      onPressIn?.(event);
    },
    [flat, disabled, scale, pressedScale, haptic, onPressIn],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      if (!flat) {
        scale.value = withSpring(1, {
          damping: 14,
          stiffness: 240,
          mass: 0.7,
        });
      }
      onPressOut?.(event);
    },
    [flat, scale, onPressOut],
  );

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

function fireHaptic(intensity: Exclude<HapticIntensity, 'none'>): void {
  // Errors swallowed — haptics are best-effort decoration, not behavior.
  switch (intensity) {
    case 'selection':
      Haptics.selectionAsync().catch(() => undefined);
      return;
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      return;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      return;
  }
}
