import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { HfCropDiseaseClient, inferFilename } from '@/modules/ai/clients/hf.client';

import type { AnalyzeResponse } from './diseases.types';

/**
 * HF `urgency` value (lowercased) that signals the photo was unusable and the
 * farmer must retake it. Matches the model's "Retake image" urgency.
 */
const RETAKE_URGENCY = 'retake image';

@Injectable()
export class DiseasesService {
  private readonly logger = new Logger(DiseasesService.name);

  constructor(private readonly hf: HfCropDiseaseClient) {}

  async analyze(imageUrl: string): Promise<AnalyzeResponse> {
    let bytes: Buffer;
    let contentType: string;
    try {
      const downloaded = await this.hf.downloadImage(imageUrl);
      bytes = downloaded.bytes;
      contentType = downloaded.contentType;
    } catch (err) {
      this.logger.warn(`Image download failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Could not fetch the image for analysis');
    }

    const result = await this.hf.analyzeBytes(
      bytes,
      contentType,
      inferFilename(imageUrl, contentType),
      '',
    );
    if (!result.ok) {
      // Non-2xx so the mobile client falls back to the on-device model.
      throw new ServiceUnavailableException(`AI analysis failed: ${result.errorCode}`);
    }

    const advisory = result.advisory;
    // Only treat as retake when an advisory is present AND signals retake. A
    // successful result without an advisory still carries a real diagnosis.
    const isRetake =
      advisory != null &&
      (advisory.urgency?.toLowerCase() === RETAKE_URGENCY ||
        advisory.primaryDiagnosis?.disease == null);

    if (isRetake) {
      return {
        status: 'retake',
        guidance:
          advisory.retakeImageGuidance ||
          advisory.severity?.basis ||
          'The photo could not be analyzed. Please retake it with better lighting and focus.',
        advisory,
      };
    }

    return {
      status: 'ok',
      engine: 'cloud',
      disease: result.disease,
      confidence: result.confidence,
      severity: result.severity,
      recommendations: result.recommendations,
      detectedCrop: result.detectedCrop,
      advisory,
    };
  }
}
