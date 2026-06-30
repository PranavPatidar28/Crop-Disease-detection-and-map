import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UserLocationState {
  latitude: number;
  longitude: number;
}

interface UseUserLocationResult {
  location: UserLocationState | null;
  permission: 'unknown' | 'granted' | 'denied';
  refresh: () => Promise<void>;
}

/**
 * Watches the user's location for the map. Battery-friendly: 30s interval +
 * 100m distance filter. One-shot fetch first so the locate-me button responds
 * immediately.
 */
export function useUserLocation(enabled = true): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocationState | null>(null);
  const [permission, setPermission] = useState<UseUserLocationResult['permission']>('unknown');
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const refresh = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    setPermission(perm.granted ? 'granted' : 'denied');
    if (!perm.granted) return;
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation({
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    });
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      setPermission(perm.granted ? 'granted' : 'denied');
      if (!perm.granted) return;

      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (cancelled) return;
      setLocation({
        latitude: initial.coords.latitude,
        longitude: initial.coords.longitude,
      });

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30_000,
          distanceInterval: 100,
        },
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
      );
      // The effect may have been torn down while watchPositionAsync was in
      // flight; the cleanup already ran with subRef still null, so this
      // subscription would leak (GPS stays active, setState on unmounted
      // component). Remove it immediately instead of storing it.
      if (cancelled) {
        sub.remove();
        return;
      }
      subRef.current = sub;
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [enabled]);

  return { location, permission, refresh };
}
