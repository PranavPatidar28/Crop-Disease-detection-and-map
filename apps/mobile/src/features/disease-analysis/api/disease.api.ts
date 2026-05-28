import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

import type { Report } from '@/features/upload-report/types';

export const diseaseApi = {
  async getReport(id: string): Promise<Report> {
    const { data } = await apiClient.get<ApiResponse<Report>>(`/reports/${id}`);
    return data.data;
  },

  async reprocess(id: string): Promise<Report> {
    const { data } = await apiClient.post<ApiResponse<Report>>(`/reports/${id}/reprocess`);
    return data.data;
  },
};
