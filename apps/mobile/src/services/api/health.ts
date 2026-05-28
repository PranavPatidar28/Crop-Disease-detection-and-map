import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

interface HealthData {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  db: 'up' | 'down';
}

export async function fetchHealth(): Promise<HealthData> {
  const { data } = await apiClient.get<ApiResponse<HealthData>>('/health');
  return data.data;
}
