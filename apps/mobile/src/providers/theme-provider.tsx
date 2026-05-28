import { createContext, useContext, type ReactNode } from 'react';

import { lightColors, type ColorScheme, type ThemePalette } from '@/theme/colors';

interface ThemeContextValue {
  scheme: ColorScheme;
  colors: ThemePalette;
}

const VALUE: ThemeContextValue = { scheme: 'light', colors: lightColors };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={VALUE}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used inside <ThemeProvider>');
  return ctx;
}
