import type { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

import type { Env } from '@/config/env.schema';

import { HfCropDiseaseClient } from './hf.client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeClient(): HfCropDiseaseClient {
  const config = {
    get: (key: keyof Env) => (key === 'HF_URL' ? 'https://hf.example' : undefined),
  } as unknown as ConfigService<Env, true>;
  // axios.create is called in the constructor; return a stub instance.
  mockedAxios.create.mockReturnValue({
    post: jest.fn(),
  } as never);
  return new HfCropDiseaseClient(config);
}

describe('HfCropDiseaseClient.analyzeBytes', () => {
  it('maps a successful HF response from raw bytes', async () => {
    const client = makeClient();
    // Reach into the configured http instance to stub the predict POST.
    const http = (client as unknown as { http: { post: jest.Mock } }).http;
    http.post.mockResolvedValue({
      data: {
        crop_name: 'Tomato',
        primary_diagnosis: {
          label: 'Tomato::Late Blight',
          crop: 'Tomato',
          disease: 'Late Blight',
          display_name: 'Tomato — Late Blight',
          is_healthy: false,
          confidence: 0.9,
          confidence_badge: 'High',
        },
        severity: { level: 'high', confidence: 0.9, decision: 'treat', basis: 'x' },
        urgency: 'Act immediately',
        when_to_call_expert: 'soon',
        rag_explanation: { status: 'ok', source: 'kb', summary: 's' },
      },
    });

    const result = await client.analyzeBytes(Buffer.from([1, 2, 3]), 'image/jpeg', 'leaf.jpg', '');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.disease).toBe('Late Blight');
      expect(result.confidence).toBe(90);
      expect(result.advisory?.urgency).toBe('Act immediately');
    }
  });

  it('maps a 422 AxiosError to an INVALID_RESPONSE failure', async () => {
    const client = makeClient();
    const http = (client as unknown as { http: { post: jest.Mock } }).http;

    // Automock leaves the constructor body out, so set the fields toFailure reads.
    const err = new AxiosError('HF rejected the image');
    err.message = 'HF rejected the image';
    (err as { response?: { status: number } }).response = { status: 422 };
    http.post.mockRejectedValue(err);

    const result = await client.analyzeBytes(Buffer.from([1, 2, 3]), 'image/jpeg', 'leaf.jpg', '');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe('INVALID_RESPONSE');
    }
  });
});
