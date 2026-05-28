import type { Severity } from '@/features/upload-report/types';

export type FlowStep = 'capture' | 'analyzing' | 'result' | 'submitted';

export type AnalysisEngine = 'cloud' | 'on-device' | 'manual';

export interface AnalysisResult {
  engine: AnalysisEngine;
  /** Diagnosed disease (e.g., "Tomato leaf curl"). May be null in manual mode. */
  disease: string | null;
  /** 0..1 confidence from the engine. Null in manual mode. */
  confidence: number | null;
  severity: Severity | null;
  /** Treatment / action recommendations rendered as a numbered list. */
  recommendations: string[];
  /** Optional alternate candidates when confidence is low (<0.6). */
  candidates?: { disease: string; confidence: number }[];
  /** Free text from the engine (e.g., "Spreading", "Localized"). */
  status?: 'spreading' | 'localized' | 'contained';
  /** Set by the user via "Edit details". When true, badge becomes "Edited by you". */
  edited?: boolean;
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

export interface FlowState {
  step: FlowStep;
  image: CapturedImage | null;
  cropType: string | null;
  notes: string;
  location: FlowLocation | null;
  result: AnalysisResult | null;
  /** When true, the report is submitted publicly to the outbreak map. */
  shareToMap: boolean;
  /** Diagnostic info on submission. */
  submittedReportId: string | null;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.6;
