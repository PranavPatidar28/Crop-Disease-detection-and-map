import type { Severity } from '@prisma/client';

/** Inbound payload to the AI service. */
export interface AnalysisRequest {
  imageUrl: string;
  cropType: string;
  /** Optional notes from the farmer; some models can use this. */
  notes?: string;
}

/** Successful diagnosis. */
export interface AnalysisSuccess {
  ok: true;
  disease: string;
  /** 0-100 */
  confidence: number;
  severity: Severity;
  recommendations: string[];
}

/** Recoverable failure — caller decides what to do (retry / persist FAILED). */
export interface AnalysisFailure {
  ok: false;
  error: string;
  errorCode: 'TIMEOUT' | 'UPSTREAM_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN';
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;
