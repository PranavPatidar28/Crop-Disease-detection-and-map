import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A thin reusable persistence abstraction. Wraps AsyncStorage with JSON
 * (de)serialization and a versioned key namespace so we can rev cache shapes
 * without colliding with old data.
 *
 * Future-ready: swap the underlying driver to MMKV / SQLite by replacing
 * the implementation here — every consumer goes through this module.
 */

const STORAGE_PREFIX = 'crop-disease.cache.';

export interface VersionedKey {
  /** Stable semantic key (e.g. 'live-reports'). */
  name: string;
  /** Bump when the persisted shape changes. Unread entries get nuked. */
  version: number;
}

function fullKey({ name, version }: VersionedKey): string {
  return `${STORAGE_PREFIX}${name}.v${version}`;
}

export const persistentStorage = {
  async load<T>(key: VersionedKey): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(fullKey(key));
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async save<T>(key: VersionedKey, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(fullKey(key), JSON.stringify(value));
    } catch {
      /* swallow — persistence is best-effort */
    }
  },

  async remove(key: VersionedKey): Promise<void> {
    try {
      await AsyncStorage.removeItem(fullKey(key));
    } catch {
      /* noop */
    }
  },

  /** Removes ALL keys under our namespace. Used on logout / cache reset. */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const ours = keys.filter((k) => k.startsWith(STORAGE_PREFIX));
      if (ours.length) await AsyncStorage.multiRemove(ours);
    } catch {
      /* noop */
    }
  },
};

/** Cache key registry — single source of truth so nothing collides. */
export const CACHE_KEYS = {
  liveReports: { name: 'live-reports', version: 1 } as VersionedKey,
  outbreaks: { name: 'outbreaks', version: 1 } as VersionedKey,
  reactQuery: { name: 'react-query', version: 1 } as VersionedKey,
} as const;
