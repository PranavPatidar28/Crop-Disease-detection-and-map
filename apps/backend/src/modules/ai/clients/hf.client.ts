import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, type AxiosInstance } from 'axios';

import type { Env } from '@/config/env.schema';

import type { AnalysisRequest, AnalysisResult } from '../dto/analysis-result';
import { mapHfResponse } from '../mappers/hf.mapper';
import type { AiClient } from './ai.client';

/**
 * Raw response shape from the Hugging Face `/predictdisease` endpoint.
 * Mirrors `PredictDiseaseResponse` in the upstream OpenAPI spec (v2.0.0).
 * Kept loose (most fields optional) so a partial payload still maps cleanly.
 */
export interface HfPredictDiseaseResponse {
  crop_name?: string | null;
  primary_diagnosis: {
    label?: string | null;
    crop?: string | null;
    disease?: string | null;
    display_name: string;
    is_healthy: boolean;
    confidence: number; // 0-1
    confidence_badge: string; // High | Medium | Low
  };
  top_3_predictions?: Array<{
    rank: number;
    label: string;
    crop: string;
    disease: string;
    confidence: number; // 0-1
  }>;
  possible_other_diseases?: Array<{
    rank: number;
    label: string;
    crop: string;
    disease: string;
    confidence: number; // 0-1
    confidence_badge: string;
  }>;
  severity: {
    level: string; // low | medium | high | unknown
    confidence: number; // 0-1
    decision: string;
    basis: string;
  };
  urgency: string; // Monitor | Act soon | Act immediately | Retake image
  symptoms_to_confirm?: string[];
  what_to_do_now?: string[];
  prevention_tips?: string[];
  when_to_call_expert: string;
  retake_image_guidance?: string | null;
  rag_explanation: {
    status: string;
    source: string;
    summary: string;
    symptoms_to_check?: string[];
    immediate_actions?: string[];
    precautions?: string[];
    prevention?: string[];
    similar_diseases?: string[];
    expert_advice?: string;
    safety_note?: string;
  };
}

const PREDICT_TIMEOUT_MS = 60_000; // RAG pipeline can be slow; budget generously.
const DOWNLOAD_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB safety cap before upload.

/**
 * Real Hugging Face crop-disease client. Used when AI_PROVIDER=huggingface.
 *
 * The HF endpoint accepts the raw image as multipart/form-data (`file`), not a
 * URL — so this client first downloads the Cloudinary asset, then forwards the
 * bytes. It self-detects the crop, so `cropType` from the report is only a hint.
 */
@Injectable()
export class HfCropDiseaseClient implements AiClient {
  readonly name = 'huggingface';
  private readonly logger = new Logger(HfCropDiseaseClient.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService<Env, true>) {
    this.http = axios.create({
      baseURL: config.get('HF_URL', { infer: true }),
      timeout: PREDICT_TIMEOUT_MS,
    });
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    let imageBytes: Buffer;
    let contentType: string;
    try {
      const downloaded = await this.downloadImage(request.imageUrl);
      imageBytes = downloaded.bytes;
      contentType = downloaded.contentType;
    } catch (err) {
      this.logger.warn(`Failed to download image for HF inference: ${(err as Error).message}`);
      return {
        ok: false,
        error: 'Could not fetch the report image for analysis',
        errorCode: 'UPSTREAM_ERROR',
      };
    }

    const filename = inferFilename(request.imageUrl, contentType);
    return this.analyzeBytes(imageBytes, contentType, filename, request.cropType);
  }

  /**
   * Post raw image bytes to HF and map the response. Shared by the async
   * report processor (which calls `analyze`, downloading the image first) and
   * the synchronous `/diseases/analyze` endpoint via `DiseasesService` (which
   * downloads the image itself with `downloadImage`, then passes the bytes).
   */
  async analyzeBytes(
    bytes: Buffer,
    contentType: string,
    filename: string,
    cropHint: string,
  ): Promise<AnalysisResult> {
    try {
      const form = new FormData();
      // Node 18+/22 provides global Blob; axios serializes native FormData as multipart.
      form.append('file', new Blob([bytes], { type: contentType }), filename);

      const { data } = await this.http.post<HfPredictDiseaseResponse>('/predictdisease', form);

      const mapped = mapHfResponse(data, cropHint);
      if (!mapped) {
        return {
          ok: false,
          error: 'HF returned an unexpected payload shape',
          errorCode: 'INVALID_RESPONSE',
        };
      }
      return { ok: true, ...mapped };
    } catch (err) {
      return this.toFailure(err);
    }
  }

  async downloadImage(url: string): Promise<{ bytes: Buffer; contentType: string }> {
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: DOWNLOAD_TIMEOUT_MS,
      maxContentLength: MAX_IMAGE_BYTES,
      maxBodyLength: MAX_IMAGE_BYTES,
    });
    const bytes = Buffer.from(res.data);
    const contentType =
      (res.headers['content-type'] as string | undefined)?.split(';')[0]?.trim() || 'image/jpeg';
    return { bytes, contentType };
  }

  private toFailure(err: unknown): AnalysisResult {
    if (err instanceof AxiosError) {
      if (err.code === 'ECONNABORTED' || err.message.toLowerCase().includes('timeout')) {
        this.logger.warn(`HF timeout after ${PREDICT_TIMEOUT_MS}ms`);
        return { ok: false, error: 'AI service timed out', errorCode: 'TIMEOUT' };
      }
      const status = err.response?.status;
      // 400 (bad image) / 422 (validation) are not worth retrying.
      if (status === 400 || status === 413 || status === 422) {
        this.logger.warn(`HF rejected the image (status=${status})`);
        return {
          ok: false,
          error: describeHfError(status),
          errorCode: 'INVALID_RESPONSE',
        };
      }
      this.logger.warn(`HF error: ${err.message} (status=${status ?? 'n/a'})`);
      return {
        ok: false,
        error: err.response?.statusText ?? err.message,
        errorCode: 'UPSTREAM_ERROR',
      };
    }
    this.logger.error('Unknown HF error', err as Error);
    return { ok: false, error: 'Unknown AI error', errorCode: 'UNKNOWN' };
  }
}

function describeHfError(status: number): string {
  switch (status) {
    case 400:
      return 'The image was empty or could not be read';
    case 413:
      return 'The image exceeds the size limit';
    case 422:
      return 'The image failed validation';
    default:
      return 'The AI service rejected the request';
  }
}

export function inferFilename(url: string, contentType: string): string {
  const fromUrl = url.split('?')[0]?.split('/').pop();
  if (fromUrl && /\.[a-z0-9]{2,5}$/i.test(fromUrl)) return fromUrl;
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  return `leaf.${ext}`;
}
