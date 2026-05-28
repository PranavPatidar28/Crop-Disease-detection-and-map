import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useLiveReportsStore } from '@/features/map-system/store/live-reports.store';

import { outbreakApi, type ListOutbreaksParams } from '../api/outbreak.api';

const POLL_FALLBACK_MS = 60_000;

/**
 * Initial fetch + 60s polling fallback for the active outbreaks list.
 * Seeds the live-reports store so socket events can upsert into the same map.
 */
export function useOutbreaks(params: ListOutbreaksParams = { active: true }) {
  const setOutbreaks = useLiveReportsStore((s) => s.setOutbreaks);

  const query = useQuery({
    queryKey: ['outbreaks', params],
    queryFn: () => outbreakApi.list(params),
    staleTime: 30_000,
    refetchInterval: POLL_FALLBACK_MS,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (query.data) setOutbreaks(query.data);
  }, [query.data, setOutbreaks]);

  return query;
}

export function useOutbreak(id: string | null) {
  return useQuery({
    queryKey: ['outbreaks', id],
    queryFn: () => outbreakApi.findById(id as string),
    enabled: !!id,
    staleTime: 15_000,
  });
}
