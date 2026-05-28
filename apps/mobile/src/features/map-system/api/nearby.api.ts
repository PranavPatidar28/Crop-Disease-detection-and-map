import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';
import type { Severity } from '@/features/upload-report/types';

import type { NearbyReportsResponse } from '../types';

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  disease?: string;
  cropType?: string;
  severity?: Severity;
  /** ISO timestamp */
  since?: string;
}

export const mapApi = {
  async nearby(params: NearbyParams): Promise<NearbyReportsResponse> {
    const { data } = await apiClient.get<ApiResponse<NearbyReportsResponse>>(
      '/reports/nearby',
      { params },
    );
    return data.data;
  },
};
