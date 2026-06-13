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
}

export interface QueueItem {
  id: string;
  draft: ReportDraft;
  status: 'pending' | 'uploading' | 'failed';
  attempts: number;
  lastError?: string;
  createdAt: string;
  nextAttemptAt?: number;
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
