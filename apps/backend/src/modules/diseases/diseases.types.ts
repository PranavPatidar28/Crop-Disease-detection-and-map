import type { Severity } from '@prisma/client';

import type { AnalysisAdvisory } from '@/modules/ai/dto/analysis-result';

/** Returned when HF produced a usable diagnosis. */
export interface AnalyzeOk {
  status: 'ok';
  engine: 'cloud';
  disease: string;
  confidence: number; // 0-100
  severity: Severity;
  recommendations: string[];
  detectedCrop?: string;
  advisory?: AnalysisAdvisory;
}

/** Returned when HF asks for a better photo / has no reliable diagnosis. */
export interface AnalyzeRetake {
  status: 'retake';
  guidance: string;
  advisory?: AnalysisAdvisory;
}

export type AnalyzeResponse = AnalyzeOk | AnalyzeRetake;
