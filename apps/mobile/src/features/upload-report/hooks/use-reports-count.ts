import { useQuery } from '@tanstack/react-query';

import { reportsApi } from '../api/reports.api';

const KEY = ['reports', 'count'] as const;

/** Total number of reports the current user has submitted. */
export function useReportsCount() {
  return useQuery<number>({
    queryKey: KEY,
    queryFn: () => reportsApi.count(),
    staleTime: 60_000,
  });
}
