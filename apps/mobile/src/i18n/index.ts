import { usePreferencesStore, type LanguageCode } from '@/store/preferences.store';

import { en, type TranslationCatalog } from './translations/en';
import { hi } from './translations/hi';

/**
 * Dotted `section.key` paths into the (two-level) catalog. Kept non-recursive
 * deliberately — a generic deep-leaf type trips TS's instantiation-depth guard.
 */
export type TranslationKey = {
  [S in keyof TranslationCatalog]: `${S & string}.${keyof TranslationCatalog[S] & string}`;
}[keyof TranslationCatalog];

/** Variables substituted into `{{token}}` placeholders at call time. */
export type TranslationParams = Record<string, string | number>;

/**
 * Catalogs by language. Only `en` and `hi` carry real copy today; the other
 * (show-only) languages intentionally have no entry and fall back to English.
 */
const CATALOGS: Partial<Record<LanguageCode, unknown>> = {
  en,
  hi,
};

/** Walk a dotted path (e.g. "profile.signOut") into a nested object. */
function lookup(source: unknown, path: string): string | undefined {
  let node: unknown = source;
  for (const segment of path.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replace `{{token}}` placeholders with the matching param value. */
function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, token: string) =>
    token in params ? String(params[token]) : match,
  );
}

/**
 * Resolve a key for a language, falling back to English when the language has
 * no catalog or is missing that specific key. Guarantees a string is returned.
 */
export function translate(
  language: LanguageCode,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const active = CATALOGS[language];
  const localized = active ? lookup(active, key) : undefined;
  const resolved = localized ?? lookup(en, key) ?? key;
  return interpolate(resolved, params);
}

export interface Translator {
  t: (key: TranslationKey, params?: TranslationParams) => string;
  language: LanguageCode;
}

/**
 * Reactive translation hook. Subscribes to the active language in the
 * preferences store, so changing language re-renders consuming screens
 * immediately — no app restart required.
 */
export function useTranslation(): Translator {
  const language = usePreferencesStore((s) => s.language);
  const t = (key: TranslationKey, params?: TranslationParams) =>
    translate(language, key, params);
  return { t, language };
}
