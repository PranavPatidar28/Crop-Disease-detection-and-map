import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

export type NotificationType = 'OUTBREAK' | 'REPORT' | 'WARNING' | 'SYSTEM';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: Severity | null;
  latitude: number | null;
  longitude: number | null;
  data: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface ListNotificationsParams {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export const notificationsApi = {
  async list(params: ListNotificationsParams = {}): Promise<PaginatedNotifications> {
    const { data } = await apiClient.get<ApiResponse<PaginatedNotifications>>('/notifications', {
      params,
    });
    return data.data;
  },

  async unreadCount(): Promise<{ count: number }> {
    const { data } = await apiClient.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count',
    );
    return data.data;
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${id}/read`,
    );
    return data.data;
  },

  async markAllRead(): Promise<{ count: number }> {
    const { data } = await apiClient.patch<ApiResponse<{ count: number }>>(
      '/notifications/read-all',
    );
    return data.data;
  },

  async remove(id: string): Promise<{ ok: true }> {
    const { data } = await apiClient.delete<ApiResponse<{ ok: true }>>(`/notifications/${id}`);
    return data.data;
  },

  async registerPushToken(token: string, platform: DevicePlatform): Promise<{ ok: true }> {
    const { data } = await apiClient.post<ApiResponse<{ ok: true }>>(
      '/users/me/push-token',
      { token, platform },
    );
    return data.data;
  },

  async revokePushToken(token: string): Promise<{ ok: true }> {
    const { data } = await apiClient.delete<ApiResponse<{ ok: true }>>(
      '/users/me/push-token',
      { data: { token } },
    );
    return data.data;
  },
};
