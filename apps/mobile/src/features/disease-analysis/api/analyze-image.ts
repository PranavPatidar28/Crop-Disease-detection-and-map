import { apiClient } from '@/services/api/client';

import type { AnalysisResult } from '@/features/report-flow/types';

interface AnalyzeBody {
  imageBase64?: string;
  imageUrl?: string;
  cropType?: string;
}

interface AnalyzeResponse {
  disease: string;
  confidence: number;
  severity: AnalysisResult['severity'];
  recommendations?: string[];
  status?: AnalysisResult['status'];
  candidates?: AnalysisResult['candidates'];
}

/**
 * Cloud disease analysis — calls the FastAPI inference endpoint.
 * The cloud engine is the first stage of the report flow's fallback chain.
 * Caller wraps this in a timeout race in `use-report-flow.ts`.
 */
export async function analyzeImage(args: AnalyzeBody): Promise<AnalysisResult> {
  const { data } = await apiClient.post<AnalyzeResponse>('/v1/diseases/analyze', args);
  return {
    engine: 'cloud',
    disease: data.disease,
    confidence: data.confidence,
    severity: data.severity,
    recommendations: data.recommendations ?? [],
    status: data.status,
    candidates: data.candidates,
  };
}
