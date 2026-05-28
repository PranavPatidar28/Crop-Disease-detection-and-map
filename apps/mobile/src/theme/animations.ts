import { Easing } from 'react-native-reanimated';

export const durations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const easings = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  emphasized: Easing.bezier(0.05, 0.7, 0.1, 1),
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
} as const;

export type DurationToken = keyof typeof durations;
