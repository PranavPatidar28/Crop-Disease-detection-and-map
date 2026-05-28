import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/user';

export interface SendOtpResponse {
  ok: true;
  expiresIn: number;
  demo: boolean;
}

export interface VerifyOtpResponse {
  token: string;
  user: User;
}

export interface UpdateMePayload {
  name?: string;
  district?: string;
  state?: string;
}

export const authApi = {
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    const { data } = await apiClient.post<ApiResponse<SendOtpResponse>>('/auth/send-otp', {
      phone,
    });
    return data.data;
  },

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
    const { data } = await apiClient.post<ApiResponse<VerifyOtpResponse>>('/auth/verify-otp', {
      phone,
      otp,
    });
    return data.data;
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data;
  },

  async updateMe(payload: UpdateMePayload): Promise<User> {
    const { data } = await apiClient.patch<ApiResponse<User>>('/users/me', payload);
    return data.data;
  },
};
