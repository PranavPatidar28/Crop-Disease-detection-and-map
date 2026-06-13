import type { ReportAdvisory, Severity } from '@/features/upload-report/types';

export type FlowStep = 'capture' | 'analyzing' | 'retake' | 'result' | 'submitted';

export type AnalysisEngine = 'cloud' | 'on-device' | 'manual';

export interface AnalysisResult {
  engine: AnalysisEngine;
  /** Diagnosed disease display name. Null in manual mode. */
  disease: string | null;
  /** 0-100 confidence. Null in manual mode. */
  confidence: number | null;
  severity: Severity | null;
  /** Detected crop (HF or on-device). Used to pre-fill / correct cropType. */
  detectedCrop?: string;
  /** Full farmer-facing advisory when the engine supplies one (HF). */
  advisory?: ReportAdvisory;
}

export interface CapturedImage {
  uri: string;
  width: number;
  height: number;
}

export interface FlowLocation {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface UploadedImage {
  imageUrl: string;
  imagePublicId: string;
}

export interface FlowState {
  step: FlowStep;
  image: CapturedImage | null;
  /** Cloudinary asset, set after the post-capture upload. */
  uploaded: UploadedImage | null;
  /** Detected/corrected crop shown on the result screen. */
  cropType: string | null;
  notes: string;
  location: FlowLocation | null;
  result: AnalysisResult | null;
  /** Guidance shown on the forced-retake screen (online HF only). */
  retakeGuidance: string | null;
  submittedReportId: string | null;
}
