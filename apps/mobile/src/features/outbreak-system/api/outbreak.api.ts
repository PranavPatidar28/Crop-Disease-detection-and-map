import type { Report } from '@/features/upload-report/types';
import type { OutbreakZone } from '@/features/map-system/types';

import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

export interface ListOutbreaksParams {
  active?: boolean;
  disease?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  since?: string;
  limit?: number;
}

export interface OutbreakDetailResponse {
  zone: OutbreakZone;
  contributingReports: Report[];
}

export const outbreakApi = {
  async list(params: ListOutbreaksParams = {}): Promise<OutbreakZone[]> {
    const { data } = await apiClient.get<ApiResponse<OutbreakZone[]>>('/outbreaks', {
      params,
    });
    return data.data;
  },

  async findById(id: string): Promise<OutbreakDetailResponse> {
    const { data } = await apiClient.get<ApiResponse<OutbreakDetailResponse>>(
      `/outbreaks/${id}`,
    );
    return data.data;
  },
};
