/**
 * Color tokens for the AgroRadar app — Soft Sage (light-only).
 * Mirrored into Tailwind theme via global.css CSS variables.
 */
export const palette = {
  brand: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#0d9488',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  status: {
    success: '#047857',
    successTint: '#ecfdf5',
    warning: '#92400e',
    warningTint: '#fef3c7',
    danger: '#b91c1c',
    dangerTint: '#fee2e2',
    info: '#1d4ed8',
    infoTint: '#dbeafe',
  },
} as const;

export const lightColors = {
  bg: '#fbfaf7',
  surface: '#ffffff',
  surfaceMuted: '#fdfcf7',
  surfaceElevated: '#ffffff',
  border: '#efeae0',
  borderStrong: '#e8e4dc',
  text: '#0b1220',
  textMuted: '#475569',
  textSubtle: '#64748b',
  textFaint: '#94a3b8',
  textInverse: '#ffffff',
  primary: palette.brand[600],
  primaryStart: palette.brand[500],
  primaryEnd: palette.brand[600],
  primaryDeep: palette.brand[900],
  primaryTint: palette.brand[50],
  forest: '#0f3d2e',
  forestEnd: '#13503a',
  forestAccent: '#7fe6bf',
  success: palette.status.success,
  successTint: palette.status.successTint,
  warning: palette.status.warning,
  warningTint: palette.status.warningTint,
  danger: palette.status.danger,
  dangerTint: palette.status.dangerTint,
  info: palette.status.info,
  infoTint: palette.status.infoTint,
} as const;

export type ThemePalette = typeof lightColors;
export type ColorScheme = 'light';

/** Light-only after redesign. The export shape is kept for backwards compat. */
export const themes: Record<ColorScheme, ThemePalette> = {
  light: lightColors,
};
