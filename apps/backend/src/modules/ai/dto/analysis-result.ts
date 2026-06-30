import type { Severity } from '@prisma/client';

/** Inbound payload to the AI service. */
export interface AnalysisRequest {
  imageUrl: string;
  cropType: string;
  /** Optional notes from the farmer; some models can use this. */
  notes?: string;
}

/** One ranked alternative prediction (top-3 or possible-other). */
export interface AdvisoryPrediction {
  rank: number;
  label: string;
  crop: string;
  disease: string;
  /** 0-100 */
  confidence: number;
  /** High | Medium | Low (only present on possible-other items). */
  confidenceBadge?: string;
}

/**
 * Full farmer-facing advisory captured from a rich provider (e.g. the HF RAG
 * pipeline). Persisted verbatim as JSON on the report so the mobile result
 * screen can render the complete picture. Optional — mock/fastapi omit it.
 */
export interface AnalysisAdvisory {
  cropName: string | null;
  primaryDiagnosis: {
    label: string | null;
    crop: string | null;
    disease: string | null;
    displayName: string;
    isHealthy: boolean;
    /** 0-100 */
    confidence: number;
    confidenceBadge: string;
  };
  top3Predictions: AdvisoryPrediction[];
  possibleOtherDiseases: AdvisoryPrediction[];
  severity: {
    /** low | medium | high | unknown — verbatim from the model. */
    level: string;
    /** 0-100 */
    confidence: number;
    decision: string;
    basis: string;
  };
  urgency: string;
  symptomsToConfirm: string[];
  whatToDoNow: string[];
  preventionTips: string[];
  whenToCallExpert: string;
  retakeImageGuidance: string | null;
  rag: {
    status: string;
    source: string;
    summary: string;
    symptomsToCheck: string[];
    immediateActions: string[];
    precautions: string[];
    prevention: string[];
    similarDiseases: string[];
    expertAdvice: string;
    safetyNote: string;
  };
}

/** Successful diagnosis. */
export interface AnalysisSuccess {
  ok: true;
  disease: string;
  /** 0-100 */
  confidence: number;
  severity: Severity;
  recommendations: string[];
  /**
   * Optional crop name detected by the model. When present, the processor may
   * use it to backfill/override the report's `cropType`.
   */
  detectedCrop?: string;
  /** Full rich advisory, when the provider supplies one. */
  advisory?: AnalysisAdvisory;
}

/** Recoverable failure — caller decides what to do (retry / persist FAILED). */
export interface AnalysisFailure {
  ok: false;
  error: string;
  errorCode: 'TIMEOUT' | 'UPSTREAM_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN';
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;
