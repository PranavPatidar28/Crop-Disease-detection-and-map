export const radii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radii;
