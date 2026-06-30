export type UploadState =
  | 'idle'
  | 'compressing'
  | 'uploading'
  | 'processing'
  | 'success'
  | 'failed'
  | 'queued-offline';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

/** Engine that produced a diagnosis. */
export type DiagnosisEngine = 'cloud' | 'on-device' | 'manual';

/**
 * Pre-computed diagnosis attached to a report on create. `cloud` is trusted and
 * stored as SUCCESS; `on-device`/`manual` are provisional and upgraded by HF.
 */
export interface DiagnosisPayload {
  disease?: string;
  confidence?: number; // 0-100
  severity?: Severity;
  advisory?: ReportAdvisory;
  engine: DiagnosisEngine;
}

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType?: string;
  fileSize?: number;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  manual: boolean;
}

export interface ReportDraft {
  cropTypeId: string;
  cropTypeName: string;
  notes?: string;
  location: ReportLocation;
  localImageUri: string;
  /** Idempotency key sent to the backend. Same key on retry → same Report row. */
  clientId: string;
  /** Provisional on-device/manual diagnosis to forward when the report syncs. */
  diagnosis?: DiagnosisPayload;
}

export interface QueueItem {
  id: string;
  draft: ReportDraft;
  status: 'pending' | 'uploading' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  nextAttemptAt?: number;
  /** Set once the Cloudinary upload succeeds, so a later server-POST retry can
   *  reuse the asset instead of uploading a fresh (orphaned) copy each attempt. */
  uploadedImageUrl?: string;
  uploadedPublicId?: string;
}

/** One ranked alternative prediction (top-3 or possible-other). */
export interface AdvisoryPrediction {
  rank: number;
  label: string;
  crop: string;
  disease: string;
  /** 0-100 */
  confidence: number;
  /** High | Medium | Low (only on possible-other items). */
  confidenceBadge?: string;
}

/**
 * Rich farmer-facing advisory captured from the AI provider's RAG pipeline.
 * Null when the provider only returned the flat diagnosis fields.
 * Mirrors the backend `AnalysisAdvisory` shape persisted on the report.
 */
export interface ReportAdvisory {
  cropName: string | null;
  primaryDiagnosis: {
    label: string | null;
    crop: string | null;
    disease: string | null;
    displayName: string;
    isHealthy: boolean;
    confidence: number;
    confidenceBadge: string;
  };
  top3Predictions: AdvisoryPrediction[];
  possibleOtherDiseases: AdvisoryPrediction[];
  severity: {
    level: string;
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

export interface Report {
  id: string;
  userId: string;
  cropType: string;
  imageUrl: string;
  imagePublicId: string;
  notes: string | null;
  latitude: number;
  longitude: number;

  /** AI diagnosis fields — populated asynchronously after creation. */
  disease: string | null;
  confidence: number | null;
  severity: Severity | null;
  recommendations: string[];
  /** Full rich advisory, when the provider supplies one (e.g. HF RAG). */
  advisory: ReportAdvisory | null;
  processingStatus: ProcessingStatus;
  aiError: string | null;
  processedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * Professional / agronomist review of a report. Demo-only — generated
 * client-side (see features/disease-analysis/mocks/expert-review.mock.ts),
 * never persisted or fetched. Not part of the backend `Report` shape.
 */
export type ExpertReviewStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';

export interface ExpertReviewer {
  /** Display name, e.g. "Dr. Anil Kanade". */
  name: string;
  /** Role + institution, e.g. "Agronomist, KVK Pune". */
  credential: string;
}

export interface ExpertReview {
  status: ExpertReviewStatus;
  expert: ExpertReviewer;
  /** Free-text guidance paragraph. Empty string while PENDING. */
  adviceNote: string;
  /** Recommended action bullets. Empty array while PENDING. */
  tips: string[];
  /** ISO timestamp; null while PENDING. */
  reviewedAt: string | null;
}
