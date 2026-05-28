import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

export type ConnectivityState = 'online' | 'offline' | 'unstable' | 'unknown';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  state: ConnectivityState;
  /** Most recent transition timestamp (ms). Used by UI banners for animation. */
  changedAt: number;

  hydrate: () => () => void;
  setFromNetInfo: (info: NetInfoState) => void;
}

function deriveState(info: NetInfoState): ConnectivityState {
  if (!info.isConnected) return 'offline';
  // `isInternetReachable === null` means we haven't probed yet — call that
  // unstable rather than blindly reporting online.
  if (info.isInternetReachable === false) return 'unstable';
  if (info.isInternetReachable === null) return 'unknown';
  return 'online';
}

/**
 * Global connectivity store. Single source of truth for online/offline state.
 * Use `useNetworkStore((s) => s.state)` selector pattern from components.
 *
 * `hydrate()` returns the unsubscribe so the caller can wire it up in a
 * useEffect cleanup.
 */
export const useNetworkStore = create<NetworkState>((set) => ({
  isConnected: true,
  isInternetReachable: null,
  state: 'unknown',
  changedAt: Date.now(),

  hydrate() {
    void NetInfo.fetch().then((info) => {
      set({
        isConnected: info.isConnected ?? false,
        isInternetReachable: info.isInternetReachable,
        state: deriveState(info),
        changedAt: Date.now(),
      });
    });
    const unsub = NetInfo.addEventListener((info) => {
      set({
        isConnected: info.isConnected ?? false,
        isInternetReachable: info.isInternetReachable,
        state: deriveState(info),
        changedAt: Date.now(),
      });
    });
    return unsub;
  },

  setFromNetInfo(info) {
    set({
      isConnected: info.isConnected ?? false,
      isInternetReachable: info.isInternetReachable,
      state: deriveState(info),
      changedAt: Date.now(),
    });
  },
}));
