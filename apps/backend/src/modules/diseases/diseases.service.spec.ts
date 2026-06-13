import { ServiceUnavailableException } from '@nestjs/common';

import type { HfCropDiseaseClient } from '@/modules/ai/clients/hf.client';
import type { AnalysisResult } from '@/modules/ai/dto/analysis-result';

import { DiseasesService } from './diseases.service';

function makeService(analyzeResult: AnalysisResult) {
  const hf = {
    downloadImage: jest
      .fn()
      .mockResolvedValue({ bytes: Buffer.from([1]), contentType: 'image/jpeg' }),
    analyzeBytes: jest.fn().mockResolvedValue(analyzeResult),
  } as unknown as HfCropDiseaseClient;
  return { service: new DiseasesService(hf), hf };
}

const okAdvisory = {
  urgency: 'Act immediately',
  retakeImageGuidance: null,
  primaryDiagnosis: { disease: 'Late Blight' },
} as never;

describe('DiseasesService.analyze', () => {
  it('returns ok for a usable diagnosis', async () => {
    const { service } = makeService({
      ok: true,
      disease: 'Late Blight',
      confidence: 90,
      severity: 'HIGH',
      recommendations: ['x'],
      detectedCrop: 'Tomato',
      advisory: okAdvisory,
    });
    const res = await service.analyze('https://cdn/leaf.jpg');
    expect(res.status).toBe('ok');
    if (res.status === 'ok') {
      expect(res.disease).toBe('Late Blight');
      expect(res.confidence).toBe(90);
      expect(res.severity).toBe('HIGH');
    }
  });

  it('returns retake when HF urgency is "Retake image"', async () => {
    const { service } = makeService({
      ok: true,
      disease: 'No reliable disease diagnosis',
      confidence: 18,
      severity: 'LOW',
      recommendations: [],
      advisory: {
        urgency: 'Retake image',
        retakeImageGuidance: 'Too washed out',
        primaryDiagnosis: { disease: null },
      } as never,
    });
    const res = await service.analyze('https://cdn/leaf.jpg');
    expect(res.status).toBe('retake');
    if (res.status === 'retake') expect(res.guidance).toBe('Too washed out');
  });

  it('throws ServiceUnavailable when HF fails', async () => {
    const { service } = makeService({ ok: false, error: 'down', errorCode: 'UPSTREAM_ERROR' });
    await expect(service.analyze('https://cdn/leaf.jpg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
