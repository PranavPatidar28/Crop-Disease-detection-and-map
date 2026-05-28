import { useEffect } from 'react';

import { useNetworkStore } from '../store/network.store';

/**
 * Hydrates the network store on mount and keeps it in sync with NetInfo.
 * Call once near the top of the tree.
 */
export function useNetworkConnectivity(): void {
  const hydrate = useNetworkStore((s) => s.hydrate);
  useEffect(() => {
    const unsub = hydrate();
    return () => {
      try {
        unsub();
      } catch {
        /* noop */
      }
    };
  }, [hydrate]);
}
