import type { HfPredictDiseaseResponse } from '../clients/hf.client';
import { mapHfResponse } from './hf.mapper';

function makePayload(overrides: Partial<HfPredictDiseaseResponse> = {}): HfPredictDiseaseResponse {
  return {
    crop_name: 'Tomato',
    primary_diagnosis: {
      label: 'Tomato::Late Blight',
      crop: 'Tomato',
      disease: 'Late Blight',
      display_name: 'Tomato — Late Blight',
      is_healthy: false,
      confidence: 0.92,
      confidence_badge: 'High',
    },
    top_3_predictions: [
      {
        rank: 1,
        label: 'Tomato::Late Blight',
        crop: 'Tomato',
        disease: 'Late Blight',
        confidence: 0.92,
      },
      {
        rank: 2,
        label: 'Tomato::Early Blight',
        crop: 'Tomato',
        disease: 'Early Blight',
        confidence: 0.05,
      },
    ],
    possible_other_diseases: [
      {
        rank: 2,
        label: 'Tomato::Early Blight',
        crop: 'Tomato',
        disease: 'Early Blight',
        confidence: 0.05,
        confidence_badge: 'Low',
      },
    ],
    severity: { level: 'high', confidence: 0.8, decision: 'treat', basis: 'High model confidence' },
    urgency: 'Act immediately',
    symptoms_to_confirm: ['Dark water-soaked lesions'],
    what_to_do_now: ['Apply copper fungicide', 'Remove infected leaves'],
    prevention_tips: ['Avoid overhead irrigation'],
    when_to_call_expert: 'If spread continues past 48h',
    retake_image_guidance: null,
    rag_explanation: {
      status: 'ok',
      source: 'knowledge-base-v2',
      summary: 'Late blight is a fast-moving fungal disease.',
      symptoms_to_check: ['White mold on leaf underside'],
      immediate_actions: ['Isolate the plant'],
      precautions: ['Wear gloves'],
      prevention: ['Rotate crops'],
      similar_diseases: ['Early Blight'],
      expert_advice: 'Contact extension officer',
      safety_note: 'Follow label dosage',
    },
    ...overrides,
  };
}

describe('mapHfResponse', () => {
  it('maps a full payload into the normalized success shape', () => {
    const mapped = mapHfResponse(makePayload());
    expect(mapped).not.toBeNull();
    expect(mapped!.disease).toBe('Late Blight');
    expect(mapped!.severity).toBe('HIGH');
    expect(mapped!.detectedCrop).toBe('Tomato');
    expect(mapped!.recommendations).toEqual(['Apply copper fungicide', 'Remove infected leaves']);
  });

  it('scales 0-1 confidence to a clamped 0-100 integer', () => {
    const mapped = mapHfResponse(makePayload());
    expect(mapped!.confidence).toBe(92);
    expect(mapped!.advisory!.primaryDiagnosis.confidence).toBe(92);
    expect(mapped!.advisory!.possibleOtherDiseases[0]!.confidence).toBe(5);
  });

  it('leaves an already 0-100 confidence untouched', () => {
    const payload = makePayload();
    payload.primary_diagnosis.confidence = 87;
    const mapped = mapHfResponse(payload);
    expect(mapped!.confidence).toBe(87);
  });

  it('maps severity level "unknown" to LOW so the outbreak engine never escalates on it', () => {
    const payload = makePayload({
      severity: { level: 'unknown', confidence: 0.3, decision: 'monitor', basis: 'Low certainty' },
    });
    const mapped = mapHfResponse(payload);
    expect(mapped!.severity).toBe('LOW');
    // ...but the verbatim level is preserved in the advisory for display.
    expect(mapped!.advisory!.severity.level).toBe('unknown');
  });

  it('preserves the retake-image guidance when the model asks for a better photo', () => {
    const payload = makePayload({
      urgency: 'Retake image',
      retake_image_guidance: 'Move closer and ensure the leaf is in focus.',
    });
    const mapped = mapHfResponse(payload);
    expect(mapped!.advisory!.retakeImageGuidance).toBe(
      'Move closer and ensure the leaf is in focus.',
    );
    expect(mapped!.advisory!.urgency).toBe('Retake image');
  });

  it('falls back to rag.immediate_actions when what_to_do_now is empty', () => {
    const payload = makePayload({ what_to_do_now: [] });
    const mapped = mapHfResponse(payload);
    expect(mapped!.recommendations).toEqual(['Isolate the plant']);
  });

  it('falls back to the display name when no specific disease is given', () => {
    const payload = makePayload();
    payload.primary_diagnosis.disease = null;
    const mapped = mapHfResponse(payload);
    expect(mapped!.disease).toBe('Tomato — Late Blight');
  });

  it('uses the fallback crop only when the model returns none', () => {
    const payload = makePayload({ crop_name: null });
    payload.primary_diagnosis.crop = null;
    const mapped = mapHfResponse(payload, 'Potato');
    expect(mapped!.detectedCrop).toBe('Potato');
  });

  it('returns null for an unusable payload (missing primary diagnosis)', () => {
    expect(mapHfResponse(undefined)).toBeNull();
    expect(
      mapHfResponse({ primary_diagnosis: {} } as unknown as HfPredictDiseaseResponse),
    ).toBeNull();
  });

  it('maps a healthy result without throwing', () => {
    const payload = makePayload({
      primary_diagnosis: {
        label: null,
        crop: 'Tomato',
        disease: 'Healthy',
        display_name: 'Tomato — Healthy',
        is_healthy: true,
        confidence: 0.99,
        confidence_badge: 'High',
      },
      severity: { level: 'low', confidence: 0.99, decision: 'none', basis: 'Healthy leaf' },
    });
    const mapped = mapHfResponse(payload);
    expect(mapped!.advisory!.primaryDiagnosis.isHealthy).toBe(true);
    expect(mapped!.severity).toBe('LOW');
  });
});
