import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

import type { Report } from '../types';

interface CreateReportPayload {
  /** Optional idempotency key. Same key + same user = no duplicate. */
  clientId?: string;
  cropType: string;
  imageUrl: string;
  imagePublicId: string;
  notes?: string;
  latitude: number;
  longitude: number;
  /** Optional pre-diagnosed disease (from the report-flow's cloud/on-device AI). */
  diseaseHint?: string;
  /** Optional pre-diagnosed severity. */
  severityHint?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** When false, the report is created privately and not added to the public outbreak map. */
  shareToMap?: boolean;
}

interface ListReportsParams {
  scope?: 'mine' | 'all';
  limit?: number;
  cursor?: string;
}

interface ListReportsResponse {
  items: Report[];
  nextCursor: string | null;
}

export const reportsApi = {
  async create(payload: CreateReportPayload): Promise<Report> {
    const { data } = await apiClient.post<ApiResponse<Report>>('/reports', payload);
    return data.data;
  },

  async list(params: ListReportsParams = {}): Promise<ListReportsResponse> {
    const { data } = await apiClient.get<ApiResponse<ListReportsResponse>>('/reports', {
      params,
    });
    return data.data;
  },

  async findById(id: string): Promise<Report> {
    const { data } = await apiClient.get<ApiResponse<Report>>(`/reports/${id}`);
    return data.data;
  },
};
