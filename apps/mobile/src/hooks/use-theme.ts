import { lightColors, type ThemePalette } from '@/theme/colors';

/** Returns the active palette. Light-only after redesign. */
export function useTheme(): ThemePalette {
  return lightColors;
}
