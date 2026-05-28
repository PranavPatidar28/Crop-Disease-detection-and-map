import axios from 'axios';

import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

export interface UploadSignaturePayload {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Direct multipart upload to Cloudinary using a server-signed signature.
 * The upload bypasses our backend so the api_secret never leaves the server.
 */
export const cloudinaryApi = {
  async getSignature(): Promise<UploadSignaturePayload> {
    const { data } = await apiClient.post<ApiResponse<UploadSignaturePayload>>(
      '/uploads/signature',
    );
    return data.data;
  },

  async uploadImage(
    localUri: string,
    sig: UploadSignaturePayload,
    onProgress?: (percent: number) => void,
  ): Promise<CloudinaryUploadResult> {
    const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

    const form = new FormData();
    // FormData in React Native accepts { uri, name, type } objects.
    form.append('file', {
      uri: localUri,
      name: 'report.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);

    const { data } = await axios.post<CloudinaryUploadResult>(url, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
      timeout: 120_000,
    });

    return data;
  },
};
