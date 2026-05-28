/**
 * Offline AI inference — architecture placeholder.
 *
 * v9 ships this module to prove the cleanest swap path for future on-device
 * inference. We intentionally do NOT implement TensorFlow Lite or ONNX yet —
 * that's a v10+ concern with non-trivial bundle / model-loading cost.
 *
 * The contract here mirrors the server-side `AiClient` interface so a future
 * on-device implementation can plug in without touching the upload flow:
 *
 *   ┌──────────────┐                ┌────────────────────┐
 *   │ useCreate-   │ —— online ──▶ │ Cloudinary + server │
 *   │ Report       │                │ AI (FastAPI/mock)   │
 *   └──────┬───────┘                └────────────────────┘
 *          │
 *          └── offline ──▶ ┌────────────────────┐
 *                          │ OnDeviceAiClient   │  (this file, v10+)
 *                          │   - tflite / onnx  │
 *                          │   - bundled model  │
 *                          └────────────────────┘
 *
 * For v9 the placeholder is a no-op that documents the future implementation
 * surface and lets the upload flow detect "offline AI not available yet"
 * without crashing.
 */

import type { Severity } from '@/features/upload-report/types';

export interface OfflineAnalysisRequest {
  /** Local file URI of the (compressed) image. */
  localImageUri: string;
  cropType: string;
  notes?: string;
}

export interface OfflineAnalysisSuccess {
  ok: true;
  disease: string;
  confidence: number;
  severity: Severity;
  recommendations: string[];
  /** Always true — distinguishes from server-side results downstream. */
  fromOnDevice: true;
}

export interface OfflineAnalysisFailure {
  ok: false;
  error: string;
  errorCode: 'UNAVAILABLE' | 'MODEL_NOT_LOADED' | 'INFERENCE_FAILED';
}

export type OfflineAnalysisResult = OfflineAnalysisSuccess | OfflineAnalysisFailure;

export interface OfflineAiClient {
  readonly name: string;
  /** Returns true when a model is bundled and ready to run. */
  isAvailable(): Promise<boolean>;
  /** Runs the model on a local image. */
  analyze(request: OfflineAnalysisRequest): Promise<OfflineAnalysisResult>;
}

/**
 * v9 stub. `isAvailable()` always returns false; `analyze()` returns
 * `errorCode: UNAVAILABLE`. This means the upload pipeline can wire it in
 * today as a fallback path and turn it on for free when v10 ships a real
 * model.
 */
export const offlineAiClient: OfflineAiClient = {
  name: 'offline-stub',
  async isAvailable() {
    return false;
  },
  async analyze() {
    return {
      ok: false,
      error: 'On-device AI inference is not yet bundled. Coming in v10.',
      errorCode: 'UNAVAILABLE',
    };
  },
};
