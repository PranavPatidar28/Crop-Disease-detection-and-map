import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Severity } from '@prisma/client';
import axios, { AxiosError, type AxiosInstance } from 'axios';

import type { Env } from '@/config/env.schema';

import type { AnalysisRequest, AnalysisResult } from '../dto/analysis-result';
import type { AiClient } from './ai.client';

interface FastApiResponse {
  disease: string;
  confidence: number; // expected 0-100 or 0-1
  severity: 'low' | 'medium' | 'high' | 'LOW' | 'MEDIUM' | 'HIGH';
  recommendations?: string[];
}

const TIMEOUT_MS = 35_000; // FastAPI may take up to ~25s; budget a buffer.

/**
 * Real FastAPI client. Used when AI_PROVIDER=fastapi.
 * Tolerant of small response shape variations (severity casing, 0-1 vs 0-100 confidence).
 */
@Injectable()
export class FastApiAiClient implements AiClient {
  readonly name = 'fastapi';
  private readonly logger = new Logger(FastApiAiClient.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService<Env, true>) {
    this.http = axios.create({
      baseURL: config.get('FASTAPI_URL', { infer: true }),
      timeout: TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    try {
      const { data } = await this.http.post<FastApiResponse>('/predict', {
        image_url: request.imageUrl,
        crop_type: request.cropType,
        notes: request.notes,
      });

      const normalized = this.normalize(data);
      if (!normalized) {
        return {
          ok: false,
          error: 'AI returned an unexpected payload shape',
          errorCode: 'INVALID_RESPONSE',
        };
      }
      return { ok: true, ...normalized };
    } catch (err) {
      if (err instanceof AxiosError) {
        if (err.code === 'ECONNABORTED' || err.message.toLowerCase().includes('timeout')) {
          this.logger.warn(`FastAPI timeout after ${TIMEOUT_MS}ms`);
          return { ok: false, error: 'AI service timed out', errorCode: 'TIMEOUT' };
        }
        this.logger.warn(`FastAPI error: ${err.message}`);
        return {
          ok: false,
          error: err.response?.statusText ?? err.message,
          errorCode: 'UPSTREAM_ERROR',
        };
      }
      this.logger.error('Unknown FastAPI error', err as Error);
      return { ok: false, error: 'Unknown AI error', errorCode: 'UNKNOWN' };
    }
  }

  private normalize(payload: FastApiResponse): {
    disease: string;
    confidence: number;
    severity: Severity;
    recommendations: string[];
  } | null {
    if (!payload || typeof payload.disease !== 'string') return null;

    let confidence = Number(payload.confidence);
    if (!Number.isFinite(confidence)) return null;
    if (confidence > 0 && confidence <= 1) confidence *= 100;
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    const sev = (payload.severity ?? '').toString().toUpperCase();
    if (sev !== 'LOW' && sev !== 'MEDIUM' && sev !== 'HIGH') return null;

    return {
      disease: payload.disease.trim(),
      confidence,
      severity: sev as Severity,
      recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : [],
    };
  }
}
