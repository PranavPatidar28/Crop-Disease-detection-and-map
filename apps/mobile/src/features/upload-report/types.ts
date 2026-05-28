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
