import { useEffect, useState } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { severityVisuals } from '@/utils/severity';
import type { Severity } from '@/features/upload-report/types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ConfidenceRingProps {
  /** 0–100 */
  value: number;
  severity?: Severity | null;
  /** Diameter in px. Defaults to 180. */
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const DURATION_MS = 1400;

/**
 * Animated circular gauge. Uses an SVG arc (240°) rendered via stroke-dashoffset
 * to sweep from 0 to the target value with eased timing. Severity color tints
 * the arc.
 */
export function ConfidenceRing({
  value,
  severity,
  size = 180,
  strokeWidth = 14,
  label = 'confidence',
}: ConfidenceRingProps) {
  const visuals = severityVisuals(severity);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Render only 75% of the circle (270°) for a gauge feel.
  const arcLength = circumference * 0.75;
  const gap = circumference - arcLength;

  const progress = useSharedValue(0);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, value));
    progress.value = 0;
    progress.value = withTiming(target, {
      duration: DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });

    // Mirror the animated value into a state-driven counter for the label.
    const start = Date.now();
    const initial = displayed;
    let frame = 0;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(initial + (target - initial) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimation(progress);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const filled = (progress.value / 100) * arcLength;
    return {
      strokeDashoffset: arcLength - filled + gap,
    };
  });

  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg
        width={size}
        height={size}
        // Rotate so the gap sits at the bottom (270° arc → start at -135°)
        style={{ transform: [{ rotate: '135deg' }] }}
      >
        <Defs>
          <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.brand[400]} />
            <Stop offset="1" stopColor={visuals.rawColor} />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gap}`}
          fill="transparent"
        />

        {/* Filled arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${gap}`}
          fill="transparent"
          animatedProps={animatedProps}
        />
      </Svg>

      <View
        className="absolute inset-0 items-center justify-center"
      >
        <Text className="text-5xl font-bold text-text">{displayed}</Text>
        <Text className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </Text>
      </View>
    </View>
  );
}

// Suppress unused param lint in some callers where layout isn't measured
export type _LayoutEvent = LayoutChangeEvent;
