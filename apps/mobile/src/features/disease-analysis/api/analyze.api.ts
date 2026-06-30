import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

import type { ReportAdvisory, Severity } from '@/features/upload-report/types';

/** Mirrors the backend AnalyzeOk shape. */
export interface AnalyzeOkResponse {
  status: 'ok';
  engine: 'cloud';
  disease: string;
  confidence: number; // 0-100
  severity: Severity;
  recommendations: string[];
  detectedCrop?: string;
  advisory?: ReportAdvisory;
}

/** Mirrors the backend AnalyzeRetake shape. */
export interface AnalyzeRetakeResponse {
  status: 'retake';
  guidance: string;
  advisory?: ReportAdvisory;
}

export type AnalyzeResponse = AnalyzeOkResponse | AnalyzeRetakeResponse;

/**
 * Per-request timeout for analyze. Overrides the global apiClient timeout
 * (15s), which is far too short here: the backend runs an HF inference that can
 * cold-start for 30-75s. Set just above the orchestrator's ANALYZE_TIMEOUT_MS
 * (90s) so the orchestrator's race is the controlling deadline and a slow HF
 * cold start isn't aborted early (which on Android surfaces as "Network Error").
 */
const ANALYZE_REQUEST_TIMEOUT_MS = 95_000;

export const diseaseAnalyzeApi = {
  /**
   * Runs HF on an already-uploaded Cloudinary image. Throws on network/5xx
   * (the caller falls back to the on-device model). The backend's global
   * TransformInterceptor wraps the payload in the { success, data } envelope,
   * so we unwrap data.data (same as reportsApi).
   */
  async analyze(imageUrl: string): Promise<AnalyzeResponse> {
    const { data } = await apiClient.post<ApiResponse<AnalyzeResponse>>(
      '/diseases/analyze',
      { imageUrl },
      { timeout: ANALYZE_REQUEST_TIMEOUT_MS },
    );
    return data.data;
  },
};
