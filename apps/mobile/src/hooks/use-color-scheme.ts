import type { ColorScheme } from '@/theme/colors';

/**
 * After the v10 redesign, AgroRadar is light-only. This hook is kept as the
 * single import point so existing call sites don't need to be touched.
 */
export function useColorScheme(): ColorScheme {
  return 'light';
}
