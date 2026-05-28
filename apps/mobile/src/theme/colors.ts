/**
 * Color tokens for the Crop Disease Mapping app.
 * Mirrored into Tailwind theme via global.css CSS variables.
 * Use this file when raw color values are needed (charts, shadows, native APIs).
 */
export const palette = {
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  status: {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
} as const;

export const lightColors = {
  bg: '#ffffff',
  surface: '#f7f8fa',
  surfaceElevated: '#ffffff',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
  text: '#0b1220',
  textMuted: '#5b6472',
  textSubtle: '#8a93a4',
  textInverse: '#ffffff',
  primary: palette.brand[600],
  primaryMuted: palette.brand[100],
  ...palette.status,
} as const;

export const darkColors = {
  bg: '#0b1220',
  surface: '#11182a',
  surfaceElevated: '#161e33',
  border: '#1f2a44',
  borderStrong: '#2a3656',
  text: '#f4f6fb',
  textMuted: '#a3acbf',
  textSubtle: '#6f7a91',
  textInverse: '#0b1220',
  primary: palette.brand[400],
  primaryMuted: palette.brand[900],
  ...palette.status,
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemePalette = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textInverse: string;
  primary: string;
  primaryMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
};
export const themes: Record<ColorScheme, ThemePalette> = {
  light: lightColors,
  dark: darkColors,
};
