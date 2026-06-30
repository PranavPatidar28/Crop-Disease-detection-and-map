import { useCallback, useReducer, useRef } from 'react';

import { diseaseAnalyzeApi } from '@/features/disease-analysis/api';
import { offlineAiClient } from '@/features/offline-ai';
import { useNetworkStore } from '@/features/offline-sync/store/network.store';
import { cloudinaryApi } from '@/features/upload-report/api/cloudinary.api';
import { useCreateReport } from '@/features/upload-report/hooks/use-create-report';
import type { DiagnosisPayload } from '@/features/upload-report/types';
import { logger } from '@/utils/logger';

import type {
  AnalysisResult,
  CapturedImage,
  FlowLocation,
  FlowState,
  FlowStep,
  UploadedImage,
} from './types';

type Action =
  | { type: 'SET_IMAGE'; image: CapturedImage }
  | { type: 'SET_UPLOADED'; uploaded: UploadedImage }
  | { type: 'SET_STEP'; step: FlowStep }
  | { type: 'SET_RESULT'; result: AnalysisResult; cropType: string | null }
  | { type: 'SET_RETAKE'; guidance: string }
  | { type: 'SET_CROP'; cropType: string }
  | { type: 'SET_LOCATION'; location: FlowLocation | null }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_SUBMITTED'; reportId: string }
  | { type: 'RESET' };

const initialState: FlowState = {
  step: 'capture',
  image: null,
  uploaded: null,
  cropType: null,
  notes: '',
  location: null,
  result: null,
  retakeGuidance: null,
  submittedReportId: null,
};

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'SET_IMAGE':
      return {
        ...state,
        image: action.image,
        step: 'analyzing',
        result: null,
        retakeGuidance: null,
        // Drop any prior upload — a fresh capture must not reuse the previous
        // asset (especially if this attempt is offline / its upload fails).
        uploaded: null,
      };
    case 'SET_UPLOADED':
      return { ...state, uploaded: action.uploaded };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_RESULT':
      return { ...state, result: action.result, cropType: action.cropType, step: 'result' };
    case 'SET_RETAKE':
      // The asset was just deleted by runAnalysis, so stop referencing it.
      return { ...state, retakeGuidance: action.guidance, step: 'retake', uploaded: null };
    case 'SET_CROP':
      return { ...state, cropType: action.cropType };
    case 'SET_LOCATION':
      return { ...state, location: action.location };
    case 'SET_NOTES':
      return { ...state, notes: action.notes };
    case 'SET_SUBMITTED':
      return { ...state, step: 'submitted', submittedReportId: action.reportId };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/** Maps the report-flow engine to the create-report diagnosis engine. */
function toDiagnosis(result: AnalysisResult): DiagnosisPayload {
  return {
    disease: result.disease ?? undefined,
    confidence: result.confidence ?? undefined,
    severity: result.severity ?? undefined,
    advisory: result.advisory,
    engine: result.engine,
  };
}

/**
 * Ceiling for the HF analyze call; on timeout we fall back to on-device.
 * Set above the backend's worst-case cold start (~60s HF predict + 15s image
 * download) so a cold HF space can still win instead of falling back early.
 */
const ANALYZE_TIMEOUT_MS = 90000;

export function useReportFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const create = useCreateReport();
  // Monotonic token so a slow analysis can't dispatch onto a fresh capture.
  const runTokenRef = useRef(0);
  // Re-entry guard for submit(): the Confirm button is tappable during the
  // 'compressing' phase (not covered by the screen's `submitting` flag), so a
  // double-tap could fire two create.submit() calls with different clientIds and
  // create duplicate reports. This guard collapses concurrent calls into one.
  const submittingRef = useRef(false);

  const runOnDevice = useCallback(
    async (image: CapturedImage, isStale: () => boolean): Promise<void> => {
      try {
        if (await offlineAiClient.isAvailable()) {
          // The availability check can take a moment to load the model; bail if
          // the run went stale meanwhile so we don't waste an inference.
          if (isStale()) return;
          const r = await offlineAiClient.analyze({ localImageUri: image.uri, cropType: '' });
          if (isStale()) return;
          if (r.ok) {
            dispatch({
              type: 'SET_RESULT',
              result: {
                engine: 'on-device',
                disease: r.disease,
                // on-device confidence is 0-1; normalize to 0-100.
                confidence: Math.round(r.confidence * 100),
                severity: r.severity,
                detectedCrop: undefined,
              },
              cropType: null,
            });
            return;
          }
        }
      } catch (err) {
        logger.warn('[report-flow] on-device analyze failed', err);
      }
      if (isStale()) return;
      // Manual last resort — empty diagnosis, farmer fills crop on the result screen.
      dispatch({
        type: 'SET_RESULT',
        result: { engine: 'manual', disease: null, confidence: null, severity: null },
        cropType: null,
      });
    },
    [],
  );

  const runAnalysis = useCallback(
    async (image: CapturedImage) => {
      const token = ++runTokenRef.current;
      const isStale = () => runTokenRef.current !== token;

      const online = useNetworkStore.getState().isConnected;

      // 1) Upload to Cloudinary so the backend (and a confirmed report) can use it.
      let uploaded: UploadedImage | null = null;
      if (online) {
        try {
          const sig = await cloudinaryApi.getSignature();
          const up = await cloudinaryApi.uploadImage(image.uri, sig);
          uploaded = { imageUrl: up.secure_url, imagePublicId: up.public_id };
          if (isStale()) return;
          dispatch({ type: 'SET_UPLOADED', uploaded });
        } catch (err) {
          logger.warn('[report-flow] upload failed, falling back to on-device', err);
        }
      }

      // 2) If we have an uploaded image, run HF. Otherwise straight to on-device.
      if (uploaded) {
        try {
          // Cap the HF call so a cold-starting / hung space doesn't strand the
          // user on the analyzing screen — on timeout we fall through to on-device.
          const res = await Promise.race([
            diseaseAnalyzeApi.analyze(uploaded.imageUrl),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('analyze-timeout')), ANALYZE_TIMEOUT_MS),
            ),
          ]);
          if (isStale()) return;
          if (res.status === 'retake') {
            // Forced retake (online HF only). Clean up the rejected asset.
            void cloudinaryApi.deleteAsset(uploaded.imagePublicId).catch(() => undefined);
            dispatch({ type: 'SET_RETAKE', guidance: res.guidance });
            return;
          }
          dispatch({
            type: 'SET_RESULT',
            result: {
              engine: 'cloud',
              disease: res.disease,
              confidence: res.confidence,
              severity: res.severity,
              detectedCrop: res.detectedCrop,
              advisory: res.advisory,
            },
            cropType: res.detectedCrop ?? null,
          });
          return;
        } catch (err) {
          logger.warn('[report-flow] HF analyze failed, falling back to on-device', err);
        }
      }

      // 3) Fallback — on-device on the local image.
      if (isStale()) return;
      await runOnDevice(image, isStale);
    },
    [runOnDevice],
  );

  const setImage = useCallback(
    (image: CapturedImage) => {
      dispatch({ type: 'SET_IMAGE', image });
      void runAnalysis(image);
    },
    [runAnalysis],
  );

  const retake = useCallback(() => {
    runTokenRef.current += 1;
    // Best-effort delete of the uploaded asset so a discarded capture doesn't
    // orphan in Cloudinary. (After an HF 'retake' verdict, state.uploaded is
    // already null — runAnalysis deleted it and SET_RETAKE cleared it — so this
    // won't double-delete.)
    const current = state.uploaded;
    if (current) void cloudinaryApi.deleteAsset(current.imagePublicId);
    dispatch({ type: 'SET_STEP', step: 'capture' });
  }, [state.uploaded]);

  const submit = useCallback(async () => {
    if (!state.image || !state.location || !state.result) return;
    if (submittingRef.current) return; // collapse double-taps into one report
    submittingRef.current = true;
    try {
      const cropType = state.cropType ?? state.result.detectedCrop ?? 'Unknown';
      const reportId = await create.submit({
        picked: { uri: state.image.uri, width: state.image.width, height: state.image.height },
        cropTypeId: cropType,
        cropTypeName: cropType,
        notes: state.notes.trim() || undefined,
        location: state.location,
        diagnosis: toDiagnosis(state.result),
        preUploaded: state.uploaded ?? undefined,
        skipNavigation: true,
      });
      if (reportId) dispatch({ type: 'SET_SUBMITTED', reportId });
    } finally {
      submittingRef.current = false;
    }
  }, [state, create]);

  return {
    state,
    setImage,
    retake,
    setCrop: (cropType: string) => dispatch({ type: 'SET_CROP', cropType }),
    setLocation: (location: FlowLocation | null) => dispatch({ type: 'SET_LOCATION', location }),
    setNotes: (notes: string) => dispatch({ type: 'SET_NOTES', notes }),
    submit,
    create,
    reset: () => {
      runTokenRef.current += 1;
      // Clean up any uploaded-but-unsubmitted asset before clearing state.
      const current = state.uploaded;
      if (current) void cloudinaryApi.deleteAsset(current.imagePublicId);
      dispatch({ type: 'RESET' });
    },
  };
}

export type UseReportFlow = ReturnType<typeof useReportFlow>;
