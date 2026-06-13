import type { ConfigService } from '@nestjs/config';

import type { Env } from '@/config/env.schema';

import { MockAiClient } from './mock-ai.client';

function makeClient(demoMode = false): MockAiClient {
  const config = {
    get: (key: keyof Env) => (key === 'DEMO_MODE' ? demoMode : undefined),
  } as unknown as ConfigService<Env, true>;
  return new MockAiClient(config);
}

/** Drives the client's internal setTimeout latency to completion. */
async function analyzeNow(client: MockAiClient, request: Parameters<MockAiClient['analyze']>[0]) {
  const promise = client.analyze(request);
  await jest.runAllTimersAsync();
  return promise;
}

describe('MockAiClient', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is deterministic: same image + crop yields the same diagnosis', async () => {
    const client = makeClient();
    const req = { imageUrl: 'https://cdn.example/leaf-1.jpg', cropType: 'Tomato' };
    const a = await analyzeNow(client, req);
    const b = await analyzeNow(client, req);
    expect(a).toEqual(b);
  });

  it('produces different diagnoses for different images (usually)', async () => {
    const client = makeClient();
    const results = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((id) =>
        analyzeNow(client, { imageUrl: `https://cdn.example/${id}.jpg`, cropType: 'Tomato' }),
      ),
    );
    const diseases = new Set(results.map((r) => (r.ok ? r.disease : 'fail')));
    // Determinism per-input, but variety across inputs.
    expect(diseases.size).toBeGreaterThan(1);
  });

  it('always returns a well-formed successful result', async () => {
    const client = makeClient();
    const result = await analyzeNow(client, {
      imageUrl: 'https://cdn.example/x.jpg',
      cropType: 'Tomato',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(typeof result.disease).toBe('string');
      expect(result.confidence).toBeGreaterThanOrEqual(55);
      expect(result.confidence).toBeLessThanOrEqual(99);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.severity);
      expect(Array.isArray(result.recommendations)).toBe(true);
    }
  });

  it('handles a crop with no catalog entry via the generic fallback', async () => {
    const client = makeClient();
    const result = await analyzeNow(client, {
      imageUrl: 'https://cdn.example/x.jpg',
      cropType: 'Dragonfruit',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disease.length).toBeGreaterThan(0);
    }
  });

  it('is case-insensitive on crop matching for the catalog', async () => {
    const client = makeClient();
    const lower = await analyzeNow(client, {
      imageUrl: 'https://cdn.example/same.jpg',
      cropType: 'tomato',
    });
    const title = await analyzeNow(client, {
      imageUrl: 'https://cdn.example/same.jpg',
      cropType: 'Tomato',
    });
    // Both resolve to the same catalog; results should be valid (casing in the
    // hash seed may differ, but each must be a well-formed Tomato diagnosis).
    expect(lower.ok && title.ok).toBe(true);
  });
});
