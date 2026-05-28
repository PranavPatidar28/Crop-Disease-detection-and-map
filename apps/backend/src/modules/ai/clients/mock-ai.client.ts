import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Severity } from '@prisma/client';

import type { Env } from '@/config/env.schema';

import { DISEASE_CATALOG, GENERIC_FALLBACK, HEALTHY_RESULT } from '../disease-catalog';
import type { AnalysisRequest, AnalysisResult } from '../dto/analysis-result';
import type { AiClient } from './ai.client';

/**
 * Deterministic mock AI client. Same imageUrl + crop always yields the same
 * diagnosis so demos are reproducible.
 *
 * Latency:
 *   - normal mode: 1500 - 2200 ms (feels like a real AI call)
 *   - DEMO_MODE:    500 -  900 ms (snappy for live demos)
 *
 * Severity bias:
 *   - normal mode: ~12% healthy, even split across catalog entries
 *   - DEMO_MODE:   ~3% healthy, biased toward HIGH-severity catalog entries
 *                  so the visible outcome on stage is dramatic
 */
@Injectable()
export class MockAiClient implements AiClient {
  readonly name = 'mock';
  private readonly logger = new Logger(MockAiClient.name);
  private readonly demoMode: boolean;

  constructor(config: ConfigService<Env, true>) {
    this.demoMode = config.get('DEMO_MODE', { infer: true });
  }

  async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const latencyMs = this.demoMode
      ? 500 + Math.floor(Math.random() * 400)
      : 1500 + Math.floor(Math.random() * 700);
    await new Promise((resolve) => setTimeout(resolve, latencyMs));

    const seed = hashString(`${request.imageUrl}|${request.cropType}`);
    const cropKey = findCropKey(request.cropType);
    const entries = cropKey ? DISEASE_CATALOG[cropKey] : undefined;

    let pick;
    const healthyChance = this.demoMode ? 3 : 12;
    if (!entries || entries.length === 0) {
      // Crops without a catalog entry: small healthy chance, otherwise generic.
      pick = seed % 100 < healthyChance ? HEALTHY_RESULT : GENERIC_FALLBACK;
    } else if (seed % 100 < healthyChance) {
      pick = HEALTHY_RESULT;
    } else if (this.demoMode) {
      // Bias: prefer the highest-severity entry for the crop.
      const severeEntries = entries.filter((e) => e.severity === 'HIGH');
      const pool = severeEntries.length ? severeEntries : entries;
      pick = pool[seed % pool.length]!;
    } else {
      pick = entries[seed % entries.length]!;
    }

    const jitter = (seed % 8) - 3; // -3..+4
    const confidence = clamp(pick.baseConfidence + jitter, 55, 99);

    this.logger.log(
      `mock analyze crop=${request.cropType} → ${pick.disease} (${confidence}% / ${pick.severity})${this.demoMode ? ' [demo]' : ''}`,
    );

    return {
      ok: true,
      disease: pick.disease,
      confidence,
      severity: pick.severity as Severity,
      recommendations: pick.recommendations,
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function findCropKey(cropType: string): string | undefined {
  const lower = cropType.toLowerCase();
  return Object.keys(DISEASE_CATALOG).find((k) => k.toLowerCase() === lower);
}
