import { useInfiniteQuery } from '@tanstack/react-query';

import { reportsApi } from '@/features/upload-report/api/reports.api';

/**
 * Infinite list of the signed-in user's own reports (`scope=mine`), newest
 * first. Backs the "Your reports" history screen. Cursor-paginated by the
 * backend; 20 per page is a comfortable mobile page size.
 */
export function useMyReports() {
  return useInfiniteQuery({
    queryKey: ['reports', 'mine'],
    queryFn: ({ pageParam }) =>
      reportsApi.list({ scope: 'mine', limit: 20, cursor: pageParam as string | undefined }),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 15_000,
  });
}
