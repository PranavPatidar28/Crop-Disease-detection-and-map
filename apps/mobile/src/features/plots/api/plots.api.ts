import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

export interface Plot {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  cropTypes: string[];
  areaAcres: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlotPayload {
  name: string;
  latitude: number;
  longitude: number;
  cropTypes?: string[];
  areaAcres?: number;
}

export interface UpdatePlotPayload {
  name?: string;
  latitude?: number;
  longitude?: number;
  cropTypes?: string[];
  areaAcres?: number;
  active?: boolean;
}

export const plotsApi = {
  async list(): Promise<Plot[]> {
    const { data } = await apiClient.get<ApiResponse<Plot[]>>('/plots');
    return data.data;
  },

  async create(payload: CreatePlotPayload): Promise<Plot> {
    const { data } = await apiClient.post<ApiResponse<Plot>>('/plots', payload);
    return data.data;
  },

  async update(id: string, payload: UpdatePlotPayload): Promise<Plot> {
    const { data } = await apiClient.patch<ApiResponse<Plot>>(`/plots/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<Plot> {
    const { data } = await apiClient.delete<ApiResponse<Plot>>(`/plots/${id}`);
    return data.data;
  },
};
