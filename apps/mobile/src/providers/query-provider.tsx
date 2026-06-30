import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, type ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

/**
 * Bumped on every breaking change to query shapes; old persisted caches are
 * dropped automatically. Keeps the offline experience honest after upgrades.
 */
const CACHE_BUSTER = 'v9.1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h — drop stale offline caches

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        staleTime: 30_000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // gcTime ≥ persistence age so cache survives
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });

/**
 * Module-singleton QueryClient. Exposed so non-React code (e.g. the auth store's
 * logout()) can clear the cache without a hook — preventing one account's cached
 * data from leaking to the next user on a shared device.
 */
export const queryClient = createClient();

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'crop-disease.cache.react-query.v1',
  throttleTime: 1000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: CACHE_BUSTER,
        maxAge: MAX_AGE_MS,
        // Don't persist mutations — they're transient, and we have our own
        // offline upload queue for the only mutation that needs durability.
        dehydrateOptions: {
          shouldDehydrateMutation: () => false,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
