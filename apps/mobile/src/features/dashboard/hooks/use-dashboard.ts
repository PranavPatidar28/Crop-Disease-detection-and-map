import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '../api/dashboard.api';
import type { DashboardData } from '../types';

export function useDashboard() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.fetchDashboard(),
    staleTime: 60_000,
  });
}
