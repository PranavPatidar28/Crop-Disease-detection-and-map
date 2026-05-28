import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { plotsApi, type CreatePlotPayload, type Plot, type UpdatePlotPayload } from '../api/plots.api';

const KEY = ['plots'] as const;

export function usePlots() {
  return useQuery<Plot[]>({
    queryKey: KEY,
    queryFn: () => plotsApi.list(),
    staleTime: 60_000,
  });
}

export function useActivePlots() {
  const query = usePlots();
  return {
    ...query,
    data: query.data?.filter((p) => p.active),
  };
}

export function useCreatePlot() {
  const qc = useQueryClient();
  return useMutation<Plot, Error, CreatePlotPayload>({
    mutationFn: (payload) => plotsApi.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdatePlot() {
  const qc = useQueryClient();
  return useMutation<Plot, Error, { id: string; payload: UpdatePlotPayload }>({
    mutationFn: ({ id, payload }) => plotsApi.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeletePlot() {
  const qc = useQueryClient();
  return useMutation<Plot, Error, string>({
    mutationFn: (id) => plotsApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
