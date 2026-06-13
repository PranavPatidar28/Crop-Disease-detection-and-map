import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants';

/** Alert-radius options in km, surfaced in the picker sheet. */
export const ALERT_RADIUS_OPTIONS = [1, 3, 5, 10, 25] as const;
export type AlertRadiusKm = (typeof ALERT_RADIUS_OPTIONS)[number];

/** Supported display languages. Stored preference only — no runtime i18n yet. */
export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
] as const;
export type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]['code'];

export interface Preferences {
  notificationsEnabled: boolean;
  alertRadiusKm: AlertRadiusKm;
  language: LanguageCode;
}

const DEFAULTS: Preferences = {
  notificationsEnabled: true,
  alertRadiusKm: 5,
  language: 'en',
};

interface PreferencesState extends Preferences {
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  setNotificationsEnabled: (value: boolean) => Promise<void>;
  setAlertRadiusKm: (value: AlertRadiusKm) => Promise<void>;
  setLanguage: (value: LanguageCode) => Promise<void>;
}

/** Coerce an untrusted persisted value back into a clean Preferences object. */
function sanitize(raw: Partial<Preferences> | null): Preferences {
  if (!raw) return { ...DEFAULTS };
  return {
    notificationsEnabled:
      typeof raw.notificationsEnabled === 'boolean'
        ? raw.notificationsEnabled
        : DEFAULTS.notificationsEnabled,
    alertRadiusKm: ALERT_RADIUS_OPTIONS.includes(raw.alertRadiusKm as AlertRadiusKm)
      ? (raw.alertRadiusKm as AlertRadiusKm)
      : DEFAULTS.alertRadiusKm,
    language: LANGUAGE_OPTIONS.some((l) => l.code === raw.language)
      ? (raw.language as LanguageCode)
      : DEFAULTS.language,
  };
}

/**
 * Local-only user preferences (notifications, alert radius, language).
 * Persisted to AsyncStorage. Hydrated on boot alongside the other stores.
 */
export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  ...DEFAULTS,
  isHydrated: false,

  async hydrate() {
    if (get().isHydrated) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.preferences);
      const parsed = raw ? (JSON.parse(raw) as Partial<Preferences>) : null;
      set({ ...sanitize(parsed), isHydrated: true });
      return;
    } catch {
      /* ignore — fall through to defaults */
    }
    set({ isHydrated: true });
  },

  async setNotificationsEnabled(value) {
    set({ notificationsEnabled: value });
    await persist(get());
  },

  async setAlertRadiusKm(value) {
    set({ alertRadiusKm: value });
    await persist(get());
  },

  async setLanguage(value) {
    set({ language: value });
    await persist(get());
  },
}));

async function persist(state: Preferences): Promise<void> {
  const shape: Preferences = {
    notificationsEnabled: state.notificationsEnabled,
    alertRadiusKm: state.alertRadiusKm,
    language: state.language,
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(shape));
  } catch {
    /* ignore */
  }
}

/** Display label for the active language code. */
export function languageLabel(code: LanguageCode): string {
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.label ?? 'English';
}
