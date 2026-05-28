import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { ReportLocation } from '../types';

type Status = 'idle' | 'requesting' | 'granted' | 'denied' | 'fetching' | 'ready' | 'error';

interface UseCurrentLocationResult {
  location: ReportLocation | null;
  status: Status;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  setManual: (lat: number, lng: number) => void;
}

export function useCurrentLocation(autoFetch = true): UseCurrentLocationResult {
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setStatus('requesting');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      setStatus('denied');
      setError('Location permission was denied. You can pick the location on the map instead.');
      return;
    }
    setStatus('fetching');
    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        manual: false,
      });
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message ?? 'Failed to get location');
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void refresh();
    }
  }, [autoFetch, refresh]);

  const setManual = useCallback((latitude: number, longitude: number) => {
    setLocation({ latitude, longitude, manual: true });
    setStatus('ready');
    setError(null);
  }, []);

  return { location, status, errorMessage, refresh, setManual };
}
