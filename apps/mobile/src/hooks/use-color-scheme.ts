import { useColorScheme as useRNColorScheme } from 'react-native';

import type { ColorScheme } from '@/theme/colors';

export function useColorScheme(): ColorScheme {
  const scheme = useRNColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
