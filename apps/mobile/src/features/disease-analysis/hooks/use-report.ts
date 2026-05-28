import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Report } from '@/features/upload-report/types';

import { diseaseApi } from '../api/disease.api';

const POLL_INTERVAL_MS = 3_000;

/**
 * Fetches a single report and polls every 3 seconds while the AI is still
 * working (processingStatus PENDING or PROCESSING). Polling stops on terminal
 * status (SUCCESS or FAILED).
 */
export function useReport(id: string | undefined) {
  return useQuery<Report>({
    queryKey: ['reports', id],
    queryFn: () => diseaseApi.getReport(id as string),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.processingStatus;
      if (status === 'SUCCESS' || status === 'FAILED') return false;
      return POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });
}

export function useReprocessReport(id: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Report, Error, void>({
    mutationFn: () => diseaseApi.reprocess(id as string),
    onSuccess: (data) => {
      queryClient.setQueryData(['reports', id], data);
    },
  });
}
