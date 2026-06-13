import type { TranslationKey } from '@/i18n';

/**
 * Returns a contextual greeting translation key based on the user's local time.
 * The caller resolves it through `t()` so the copy follows the active language.
 */
export function useGreeting(): TranslationKey {
  const hour = new Date().getHours();
  if (hour < 5) return 'greeting.upEarly';
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  if (hour < 21) return 'greeting.evening';
  return 'greeting.night';
}
