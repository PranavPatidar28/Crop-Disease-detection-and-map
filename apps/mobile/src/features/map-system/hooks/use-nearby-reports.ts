import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { mapApi, type NearbyParams } from '../api/nearby.api';
import { useLiveReportsStore } from '../store/live-reports.store';

const POLL_FALLBACK_MS = 30_000;

/**
 * Fetches nearby reports for the current map center / filters and seeds the
 * live-reports store. Acts as both initial load and a 30s polling safety net
 * (in case the socket drops without us noticing).
 *
 * Pass `enabled=false` to suspend (e.g. while the user has no location yet).
 */
export function useNearbyReports(params: NearbyParams | null) {
  const setMany = useLiveReportsStore((s) => s.setMany);

  const query = useQuery({
    queryKey: ['nearby-reports', params],
    queryFn: () => mapApi.nearby(params as NearbyParams),
    enabled: !!params,
    staleTime: 15_000,
    refetchInterval: POLL_FALLBACK_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (query.data?.items) setMany(query.data.items);
  }, [query.data, setMany]);

  return query;
}
