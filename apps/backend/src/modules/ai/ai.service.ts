import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';

import { FastApiAiClient } from './clients/fastapi.client';
import { HfCropDiseaseClient } from './clients/hf.client';
import { MockAiClient } from './clients/mock-ai.client';
import type { AnalysisRequest, AnalysisResult } from './dto/analysis-result';

/**
 * Facade in front of the chosen AI client. Picks `mock` or `fastapi` based on
 * env, retries once on failure, and always returns a normalized result.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  /** Base delay before the single retry, plus jitter, to avoid hammering a
   *  struggling upstream the instant it timed out. */
  private static readonly RETRY_BASE_MS = 500;
  private static readonly RETRY_JITTER_MS = 500;

  constructor(
    private readonly mock: MockAiClient,
    private readonly fastapi: FastApiAiClient,
    private readonly huggingface: HfCropDiseaseClient,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const provider = this.config.get('AI_PROVIDER', { infer: true });
    const client =
      provider === 'huggingface'
        ? this.huggingface
        : provider === 'fastapi'
          ? this.fastapi
          : this.mock;

    this.logger.log(`Analyzing report (provider=${client.name}, crop=${request.cropType})`);

    const first = await client.analyze(request);
    if (first.ok) return first;

    // One retry on retryable failures
    const retryable = first.errorCode === 'TIMEOUT' || first.errorCode === 'UPSTREAM_ERROR';
    if (!retryable) return first;

    const delay = AiService.RETRY_BASE_MS + Math.floor(Math.random() * AiService.RETRY_JITTER_MS);
    this.logger.warn(`AI ${first.errorCode}; retrying once after ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return client.analyze(request);
  }
}
