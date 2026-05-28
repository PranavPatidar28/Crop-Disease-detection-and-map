import { useColorScheme } from './use-color-scheme';
import { themes, type ThemePalette } from '@/theme/colors';

/** Returns the active palette (raw colors) based on the OS color scheme. */
export function useTheme(): ThemePalette {
  const scheme = useColorScheme();
  return themes[scheme];
}
