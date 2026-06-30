import type { Severity } from '@prisma/client';

import type { HfPredictDiseaseResponse } from '../clients/hf.client';
import type { AdvisoryPrediction, AnalysisAdvisory, AnalysisSuccess } from '../dto/analysis-result';

type MappedSuccess = Omit<AnalysisSuccess, 'ok'>;

/** Scale a 0-1 (or already 0-100) confidence into a clamped 0-100 integer. */
function toPercent(value: unknown): number {
  let n = Number(value);
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1) n *= 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Map the HF severity level to the Prisma `Severity` enum.
 * The model can return `unknown`; we treat that as LOW so the outbreak engine
 * (which keys off enum severity) never escalates on an uncertain triage.
 */
function toSeverityEnum(level: string | undefined): Severity {
  switch ((level ?? '').toLowerCase()) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
    case 'unknown':
    default:
      return 'LOW';
  }
}

function mapPredictions(
  items:
    | HfPredictDiseaseResponse['top_3_predictions']
    | HfPredictDiseaseResponse['possible_other_diseases'],
): AdvisoryPrediction[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    rank: Number(item.rank) || 0,
    label: item.label ?? '',
    crop: item.crop ?? '',
    disease: item.disease ?? '',
    confidence: toPercent(item.confidence),
    confidenceBadge: 'confidence_badge' in item ? item.confidence_badge : undefined,
  }));
}

/**
 * Pick the best human-readable recommendation list to store in the flat
 * `recommendations[]` column (kept for backward compatibility with the mock /
 * fastapi paths and any UI that only reads that field). Preference order:
 * what_to_do_now → rag.immediate_actions → prevention_tips.
 */
function pickRecommendations(payload: HfPredictDiseaseResponse): string[] {
  const candidates = [
    payload.what_to_do_now,
    payload.rag_explanation?.immediate_actions,
    payload.prevention_tips,
  ];
  for (const list of candidates) {
    if (Array.isArray(list) && list.length > 0) return list;
  }
  return [];
}

function buildAdvisory(payload: HfPredictDiseaseResponse): AnalysisAdvisory {
  const pd = payload.primary_diagnosis;
  const sev = payload.severity;
  const rag = payload.rag_explanation;
  return {
    cropName: payload.crop_name ?? null,
    primaryDiagnosis: {
      label: pd.label ?? null,
      crop: pd.crop ?? null,
      disease: pd.disease ?? null,
      displayName: pd.display_name,
      isHealthy: Boolean(pd.is_healthy),
      confidence: toPercent(pd.confidence),
      confidenceBadge: pd.confidence_badge ?? '',
    },
    top3Predictions: mapPredictions(payload.top_3_predictions),
    possibleOtherDiseases: mapPredictions(payload.possible_other_diseases),
    severity: {
      level: (sev?.level ?? 'unknown').toLowerCase(),
      confidence: toPercent(sev?.confidence),
      decision: sev?.decision ?? '',
      basis: sev?.basis ?? '',
    },
    urgency: payload.urgency ?? '',
    symptomsToConfirm: payload.symptoms_to_confirm ?? [],
    whatToDoNow: payload.what_to_do_now ?? [],
    preventionTips: payload.prevention_tips ?? [],
    whenToCallExpert: payload.when_to_call_expert ?? '',
    retakeImageGuidance: payload.retake_image_guidance ?? null,
    rag: {
      status: rag?.status ?? '',
      source: rag?.source ?? '',
      summary: rag?.summary ?? '',
      symptomsToCheck: rag?.symptoms_to_check ?? [],
      immediateActions: rag?.immediate_actions ?? [],
      precautions: rag?.precautions ?? [],
      prevention: rag?.prevention ?? [],
      similarDiseases: rag?.similar_diseases ?? [],
      expertAdvice: rag?.expert_advice ?? '',
      safetyNote: rag?.safety_note ?? '',
    },
  };
}

/**
 * Map a raw HF `/predictdisease` payload into the normalized success shape.
 * Returns `null` when the payload is unusable (missing primary diagnosis),
 * letting the client surface an INVALID_RESPONSE failure.
 *
 * @param fallbackCrop the report's declared crop, used only when the model
 *   does not return a crop of its own.
 */
export function mapHfResponse(
  payload: HfPredictDiseaseResponse | undefined,
  fallbackCrop?: string,
): MappedSuccess | null {
  if (!payload?.primary_diagnosis || typeof payload.primary_diagnosis.display_name !== 'string') {
    return null;
  }

  const pd = payload.primary_diagnosis;
  // Use the specific disease name when available, else the farmer-facing label.
  const disease = (pd.disease || pd.display_name || '').trim();
  if (!disease) return null;

  const detectedCrop = (payload.crop_name || pd.crop || fallbackCrop || '').trim() || undefined;

  return {
    disease,
    confidence: toPercent(pd.confidence),
    severity: toSeverityEnum(payload.severity?.level),
    recommendations: pickRecommendations(payload),
    detectedCrop,
    advisory: buildAdvisory(payload),
  };
}
