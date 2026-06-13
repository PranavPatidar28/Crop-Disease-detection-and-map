# Crop Disease Detection — Flow & UI Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the HF model the primary crop-disease diagnosis (with on-device fallback when offline/failed), unify the capture→review→submit flow, and rebuild the report-flow UI around a triage-first result screen.

**Architecture:** Mobile uploads the photo to Cloudinary, then calls a new synchronous backend endpoint `POST /diseases/analyze` that runs the HF client and returns the advisory. The farmer reviews one result and confirms; the diagnosis is attached to the report on create. Offline or on HF failure, the on-device TFLite model produces a provisional diagnosis that the backend upgrades to HF on sync.

**Tech Stack:** NestJS 10 + Prisma (backend), Expo SDK 56 + Expo Router + Zustand + TanStack Query (mobile), react-native-fast-tflite (on-device).

**Spec:** `docs/superpowers/specs/2026-06-12-crop-disease-flow-rework-design.md`

**Verification commands (run from repo root unless noted):**
- Backend tests: `pnpm --filter backend jest <path>`
- Backend typecheck: `pnpm --filter backend typecheck`
- Backend lint: `pnpm --filter backend lint`
- Backend build: `pnpm --filter backend build`
- Mobile typecheck: `pnpm --filter mobile typecheck`

> **Backend dev watcher note:** `nest start --watch` holds a lock on the Prisma query-engine DLL on Windows. If a Prisma command fails with `EPERM ... query_engine-windows.dll.node`, stop the backend watcher first, run the command, then restart it.

---

## Phase 1 — Backend: synchronous analyze endpoint

### Task 1: HF client can analyze from raw bytes (refactor for reuse)

The existing `HfCropDiseaseClient.analyze()` downloads the image from `imageUrl` then posts multipart to HF. The new endpoint also passes an `imageUrl` (Cloudinary), so the client works **as-is** — but extract the "post bytes to HF + map" core into a public method so the new `DiseasesService` can call it without duplicating multipart logic.

**Files:**
- Modify: `apps/backend/src/modules/ai/clients/hf.client.ts`
- Test: `apps/backend/src/modules/ai/clients/hf.client.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/modules/ai/clients/hf.client.spec.ts`:

```ts
import type { ConfigService } from '@nestjs/config';
import axios from 'axios';

import type { Env } from '@/config/env.schema';

import { HfCropDiseaseClient } from './hf.client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeClient(): HfCropDiseaseClient {
  const config = {
    get: (key: keyof Env) =>
      key === 'HF_URL' ? 'https://hf.example' : undefined,
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend jest src/modules/ai/clients/hf.client.spec.ts`
Expected: FAIL — `client.analyzeBytes is not a function`.

- [ ] **Step 3: Refactor `hf.client.ts` to expose `analyzeBytes`**

In `apps/backend/src/modules/ai/clients/hf.client.ts`, replace the body of `analyze()` so it downloads then delegates to a new public `analyzeBytes()`. Find the current `analyze` method:

```ts
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

    try {
      const form = new FormData();
      const filename = inferFilename(request.imageUrl, contentType);
      // Node 18+/22 provides global Blob; axios serializes native FormData as multipart.
      form.append('file', new Blob([imageBytes], { type: contentType }), filename);

      const { data } = await this.http.post<HfPredictDiseaseResponse>('/predictdisease', form);

      const mapped = mapHfResponse(data, request.cropType);
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
```

Replace it with:

```ts
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
   * report processor (via `analyze`) and the synchronous `/diseases/analyze`
   * endpoint (which already has the bytes / a URL).
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
```

Also expose `downloadImage` for the service (change `private async downloadImage` to `async downloadImage`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend jest src/modules/ai/clients/hf.client.spec.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + commit**

Run: `pnpm --filter backend typecheck`
Expected: no errors.

```bash
git add apps/backend/src/modules/ai/clients/hf.client.ts apps/backend/src/modules/ai/clients/hf.client.spec.ts
git commit -m "refactor(ai): expose HfCropDiseaseClient.analyzeBytes for reuse"
```

### Task 2: DiseasesService + analyze response shape

The service injects `HfCropDiseaseClient` directly (always HF, independent of `AI_PROVIDER`). It downloads the Cloudinary image, runs HF, and classifies the outcome into `ok` / `retake` / failure.

**Files:**
- Create: `apps/backend/src/modules/diseases/diseases.service.ts`
- Create: `apps/backend/src/modules/diseases/dto/analyze.dto.ts`
- Create: `apps/backend/src/modules/diseases/diseases.types.ts`
- Test: `apps/backend/src/modules/diseases/diseases.service.spec.ts` (create)

- [ ] **Step 1: Create the analyze DTO**

Create `apps/backend/src/modules/diseases/dto/analyze.dto.ts`:

```ts
import { IsString, IsUrl, MaxLength } from 'class-validator';

export class AnalyzeDiseaseDto {
  /** Cloudinary (or other public) URL of the captured leaf image. */
  @IsString()
  @IsUrl()
  @MaxLength(2048)
  imageUrl!: string;
}
```

- [ ] **Step 2: Create the response types**

Create `apps/backend/src/modules/diseases/diseases.types.ts`:

```ts
import type { AnalysisAdvisory } from '@/modules/ai/dto/analysis-result';
import type { Severity } from '@prisma/client';

/** Returned when HF produced a usable diagnosis. */
export interface AnalyzeOk {
  status: 'ok';
  engine: 'cloud';
  disease: string;
  confidence: number; // 0-100
  severity: Severity;
  recommendations: string[];
  detectedCrop?: string;
  advisory?: AnalysisAdvisory;
}

/** Returned when HF asks for a better photo / has no reliable diagnosis. */
export interface AnalyzeRetake {
  status: 'retake';
  guidance: string;
  advisory?: AnalysisAdvisory;
}

export type AnalyzeResponse = AnalyzeOk | AnalyzeRetake;
```

- [ ] **Step 3: Write the failing service test**

Create `apps/backend/src/modules/diseases/diseases.service.spec.ts`:

```ts
import { ServiceUnavailableException } from '@nestjs/common';

import type { HfCropDiseaseClient } from '@/modules/ai/clients/hf.client';
import type { AnalysisResult } from '@/modules/ai/dto/analysis-result';

import { DiseasesService } from './diseases.service';

function makeService(analyzeResult: AnalysisResult) {
  const hf = {
    downloadImage: jest.fn().mockResolvedValue({ bytes: Buffer.from([1]), contentType: 'image/jpeg' }),
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter backend jest src/modules/diseases/diseases.service.spec.ts`
Expected: FAIL — cannot find `./diseases.service`.

- [ ] **Step 5: Implement the service**

Create `apps/backend/src/modules/diseases/diseases.service.ts`:

```ts
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { HfCropDiseaseClient } from '@/modules/ai/clients/hf.client';

import type { AnalyzeResponse } from './diseases.types';

function inferFilename(url: string): string {
  const fromUrl = url.split('?')[0]?.split('/').pop();
  if (fromUrl && /\.[a-z0-9]{2,5}$/i.test(fromUrl)) return fromUrl;
  return 'leaf.jpg';
}

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

    const result = await this.hf.analyzeBytes(bytes, contentType, inferFilename(imageUrl), '');
    if (!result.ok) {
      // Non-2xx so the mobile client falls back to the on-device model.
      throw new ServiceUnavailableException(`AI analysis failed: ${result.errorCode}`);
    }

    const advisory = result.advisory;
    const isRetake =
      advisory?.urgency?.toLowerCase() === 'retake image' ||
      advisory?.primaryDiagnosis?.disease == null;

    if (isRetake) {
      return {
        status: 'retake',
        guidance:
          advisory?.retakeImageGuidance ||
          advisory?.severity?.basis ||
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter backend jest src/modules/diseases/diseases.service.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/src/modules/diseases/
git commit -m "feat(diseases): add DiseasesService with HF analyze + retake detection"
```

### Task 3: DiseasesController + DiseasesModule + app wiring

**Files:**
- Create: `apps/backend/src/modules/diseases/diseases.controller.ts`
- Create: `apps/backend/src/modules/diseases/diseases.module.ts`
- Modify: `apps/backend/src/modules/ai/ai.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Export HfCropDiseaseClient from AiModule**

`DiseasesService` injects `HfCropDiseaseClient` directly, so `AiModule` must export it. In `apps/backend/src/modules/ai/ai.module.ts`, change:

```ts
@Module({
  providers: [AiService, MockAiClient, FastApiAiClient, HfCropDiseaseClient],
  exports: [AiService],
})
export class AiModule {}
```

to:

```ts
@Module({
  providers: [AiService, MockAiClient, FastApiAiClient, HfCropDiseaseClient],
  exports: [AiService, HfCropDiseaseClient],
})
export class AiModule {}
```

- [ ] **Step 2: Create the controller**

Create `apps/backend/src/modules/diseases/diseases.controller.ts`:

```ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { AnalyzeDiseaseDto } from './dto/analyze.dto';
import { DiseasesService } from './diseases.service';

@Controller('diseases')
export class DiseasesController {
  constructor(private readonly diseases: DiseasesService) {}

  /**
   * Synchronous diagnosis for the capture→review flow. Runs HF and returns the
   * advisory (or a retake signal). Creates NO report — the client confirms
   * separately via POST /reports. Authed by the global JwtAuthGuard.
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyze(@Body() dto: AnalyzeDiseaseDto) {
    return this.diseases.analyze(dto.imageUrl);
  }
}
```

- [ ] **Step 3: Create the module**

Create `apps/backend/src/modules/diseases/diseases.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { AiModule } from '@/modules/ai/ai.module';

import { DiseasesController } from './diseases.controller';
import { DiseasesService } from './diseases.service';

@Module({
  imports: [AiModule],
  controllers: [DiseasesController],
  providers: [DiseasesService],
})
export class DiseasesModule {}
```

- [ ] **Step 4: Register in app.module.ts**

In `apps/backend/src/app.module.ts`, add the import near the other module imports (alphabetical with the rest):

```ts
import { DiseasesModule } from './modules/diseases/diseases.module';
```

and add `DiseasesModule` to the `imports` array (place it after `CloudinaryModule`):

```ts
    CloudinaryModule,
    DiseasesModule,
    ReportsModule,
```

- [ ] **Step 5: Build to verify wiring**

Run: `pnpm --filter backend build`
Expected: build succeeds (Nest resolves `DiseasesService`'s `HfCropDiseaseClient` dependency via the exported provider).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/diseases/ apps/backend/src/modules/ai/ai.module.ts apps/backend/src/app.module.ts
git commit -m "feat(diseases): wire POST /diseases/analyze endpoint"
```

### Task 4: DELETE /uploads/:publicId for retake cleanup

**Files:**
- Modify: `apps/backend/src/modules/cloudinary/cloudinary.controller.ts`

- [ ] **Step 1: Add the delete route**

Replace the contents of `apps/backend/src/modules/cloudinary/cloudinary.controller.ts`:

```ts
import { Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';

import { CloudinaryService, UploadSignaturePayload } from './cloudinary.service';

@Controller('uploads')
export class CloudinaryController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post('signature')
  signature(): UploadSignaturePayload {
    return this.cloudinary.generateUploadSignature();
  }

  /**
   * Best-effort delete of an uploaded asset. Used when the farmer is forced to
   * retake (HF rejected the photo) or abandons before confirming, so we don't
   * leak orphaned Cloudinary assets. The publicId may contain slashes (folder
   * prefix), so it's captured as a wildcard param.
   */
  @Delete(':publicId(*)')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('publicId') publicId: string): Promise<void> {
    await this.cloudinary.destroy(publicId);
  }
}
```

> Note: `CloudinaryService.destroy` already exists and swallows errors. The `(*)` wildcard lets `crop-disease/reports/abc123` be passed as a single param. The mobile client must URL-encode the publicId.

- [ ] **Step 2: Build to verify**

Run: `pnpm --filter backend build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/cloudinary/cloudinary.controller.ts
git commit -m "feat(uploads): add DELETE /uploads/:publicId for retake cleanup"
```

---

## Phase 2 — Backend: report creation accepts a pre-computed diagnosis

### Task 5: Extend CreateReportDto with diagnosis fields

**Files:**
- Modify: `apps/backend/src/modules/reports/dto/create-report.dto.ts`
- Test: `apps/backend/src/modules/reports/dto/create-report.dto.spec.ts` (create)

- [ ] **Step 1: Write the failing validation test**

Create `apps/backend/src/modules/reports/dto/create-report.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { CreateReportDto } from './create-report.dto';

const base = {
  cropType: 'Tomato',
  imageUrl: 'https://cdn/leaf.jpg',
  imagePublicId: 'crop-disease/reports/abc',
  latitude: 12.9,
  longitude: 77.5,
};

function build(extra: Record<string, unknown>) {
  const dto = plainToInstance(CreateReportDto, { ...base, ...extra });
  return validateSync(dto);
}

describe('CreateReportDto diagnosis fields', () => {
  it('accepts a full cloud diagnosis', () => {
    const errors = build({
      disease: 'Late Blight',
      confidence: 90,
      severity: 'HIGH',
      engine: 'cloud',
      advisory: { urgency: 'Act immediately' },
    });
    expect(errors).toHaveLength(0);
  });

  it('accepts no diagnosis fields (backward compatible)', () => {
    expect(build({})).toHaveLength(0);
  });

  it('rejects an invalid engine value', () => {
    const errors = build({ engine: 'quantum' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects confidence out of range', () => {
    const errors = build({ confidence: 150 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend jest src/modules/reports/dto/create-report.dto.spec.ts`
Expected: FAIL — the `engine: 'quantum'` and `confidence: 150` cases pass validation because the fields don't exist yet.

- [ ] **Step 3: Add the fields**

In `apps/backend/src/modules/reports/dto/create-report.dto.ts`, update the imports line:

```ts
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Severity } from '@prisma/client';
```

Then add these fields inside the class, after the `longitude` field:

```ts
  // --- Pre-computed diagnosis (from the capture→review flow) ---

  /** Diagnosed disease name. Present when the client already ran analysis. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  disease?: string;

  /** 0-100 confidence. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  severity?: Severity;

  /** Full farmer-facing advisory JSON (stored verbatim in the advisory column). */
  @IsOptional()
  @IsObject()
  advisory?: Record<string, unknown>;

  /**
   * Which engine produced the diagnosis. `cloud` results are trusted and stored
   * as SUCCESS without re-running HF; `on-device`/`manual` are provisional and
   * get upgraded by the processor.
   */
  @IsOptional()
  @IsIn(['cloud', 'on-device', 'manual'])
  engine?: 'cloud' | 'on-device' | 'manual';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend jest src/modules/reports/dto/create-report.dto.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/reports/dto/create-report.dto.ts apps/backend/src/modules/reports/dto/create-report.dto.spec.ts
git commit -m "feat(reports): accept pre-computed diagnosis fields in CreateReportDto"
```

### Task 6: ReportsService.create persists diagnosis + conditional scheduling

When `engine === 'cloud'` with a disease, store as SUCCESS with the advisory and do NOT schedule HF — but still run outbreak/realtime/fanout (delegated to a new processor method). Otherwise store provisional fields as PENDING and schedule the processor (which upgrades via HF).

**Files:**
- Modify: `apps/backend/src/modules/reports/reports.service.ts`

- [ ] **Step 1: Update the create() data mapping**

In `apps/backend/src/modules/reports/reports.service.ts`, locate the `prisma.report.create({ data: {...} })` block inside `create()`. Replace the `data` object so it conditionally stores the diagnosis. Find:

```ts
    const report = await this.prisma.report
      .create({
        data: {
          userId,
          clientId: dto.clientId ?? null,
          cropType: dto.cropType,
          imageUrl: dto.imageUrl,
          imagePublicId: dto.imagePublicId,
          notes: dto.notes ?? null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          processingStatus: ProcessingStatus.PENDING,
        },
      })
```

Replace with:

```ts
    // A trusted cloud diagnosis (already run through HF on the client's behalf
    // via /diseases/analyze) is stored as SUCCESS immediately. on-device/manual
    // diagnoses are provisional: store what we have but leave PENDING so the
    // processor upgrades them via HF.
    const isCloudSuccess = dto.engine === 'cloud' && !!dto.disease;

    const report = await this.prisma.report
      .create({
        data: {
          userId,
          clientId: dto.clientId ?? null,
          cropType: dto.cropType,
          imageUrl: dto.imageUrl,
          imagePublicId: dto.imagePublicId,
          notes: dto.notes ?? null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          disease: dto.disease ?? null,
          confidence: dto.confidence ?? null,
          severity: dto.severity ?? null,
          recommendations: isCloudSuccess
            ? (dto.advisory?.whatToDoNow as string[] | undefined) ?? []
            : [],
          advisory: dto.advisory
            ? (dto.advisory as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          processingStatus: isCloudSuccess
            ? ProcessingStatus.SUCCESS
            : ProcessingStatus.PENDING,
          processedAt: isCloudSuccess ? new Date() : null,
        },
      })
```

> Note: `Prisma` is already imported at the top of this file (`import { Prisma, ProcessingStatus, type Report } from '@prisma/client';`).

- [ ] **Step 2: Branch the post-create side effects**

Find the scheduling block at the end of `create()`:

```ts
    // Fire-and-forget AI processing. Returns immediately so the HTTP request
    // doesn't block on a 25s upstream call. Only schedule for freshly-created
    // PENDING rows (a deduped existing row may already be SUCCESS/PROCESSING).
    if (report.processingStatus === ProcessingStatus.PENDING) {
      this.processor.schedule(report);
    }

    return report;
```

Replace with:

```ts
    // Cloud diagnosis: skip HF (already done) but still fan out to outbreak /
    // realtime / notifications. Provisional/pending: schedule the processor,
    // which runs HF (upgrading on-device/manual) then fans out.
    if (report.processingStatus === ProcessingStatus.SUCCESS) {
      this.processor.handleClientDiagnosis(report);
    } else if (report.processingStatus === ProcessingStatus.PENDING) {
      this.processor.schedule(report);
    }

    return report;
```

> `handleClientDiagnosis` is added to the processor in Task 7. The idempotency guard above (returning an existing deduped row) is unchanged: a deduped row never reaches this block as a fresh create, so no double fan-out.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter backend typecheck`
Expected: FAIL — `handleClientDiagnosis` does not exist yet on `ReportsProcessor`. That's expected; Task 7 adds it. (Do not commit yet.)

- [ ] **Step 4: Note for commit**

This task commits together with Task 7 (they're interdependent). Proceed to Task 7.

### Task 7: ReportsProcessor — extract fan-out + add handleClientDiagnosis

The processor's success path currently inlines the realtime broadcast, outbreak handling, and high-severity fanout. Extract that into a reusable `fanOut(report)` method, call it from the existing HF success path, and add a new `handleClientDiagnosis(report)` that fans out a already-SUCCESS cloud report without running HF.

**Files:**
- Modify: `apps/backend/src/modules/reports/reports.processor.ts`

- [ ] **Step 1: Extract the fan-out block**

In `apps/backend/src/modules/reports/reports.processor.ts`, find the success branch inside `run()`:

```ts
      if (result.ok) {
        const updated = await this.prisma.report.update({
          where: { id: report.id },
          data: {
            disease: result.disease,
            confidence: result.confidence,
            severity: result.severity,
            recommendations: result.recommendations,
            // Backfill the crop from the model when the farmer left it blank or
            // generic. Never clobber a crop the farmer explicitly chose.
            ...(result.detectedCrop && isGenericCrop(report.cropType)
              ? { cropType: result.detectedCrop }
              : {}),
            advisory: result.advisory
              ? (result.advisory as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            processingStatus: ProcessingStatus.SUCCESS,
            aiError: null,
            processedAt: new Date(),
          },
        });
        this.logger.log(`Report ${report.id} → ${result.disease} (${result.confidence}%)`);

        // Broadcast the report and let the outbreak engine react.
        this.realtime.reportCreated(updated);
        void this.outbreak.handleNewReport(updated).catch((err) => {
          this.logger.error('Outbreak processing failed', err as Error);
        });

        // Notify users with plots near a HIGH-severity report.
        if (updated.severity === Severity.HIGH) {
          void this.fanout.handleHighSeverityReport(updated).catch((err) => {
            this.logger.warn(`High-severity report fanout failed: ${(err as Error).message}`);
          });
        }
      } else {
```

Replace it with (note the fan-out is now a method call):

```ts
      if (result.ok) {
        const updated = await this.prisma.report.update({
          where: { id: report.id },
          data: {
            disease: result.disease,
            confidence: result.confidence,
            severity: result.severity,
            recommendations: result.recommendations,
            // Backfill the crop from the model when the farmer left it blank or
            // generic. Never clobber a crop the farmer explicitly chose.
            ...(result.detectedCrop && isGenericCrop(report.cropType)
              ? { cropType: result.detectedCrop }
              : {}),
            advisory: result.advisory
              ? (result.advisory as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            processingStatus: ProcessingStatus.SUCCESS,
            aiError: null,
            processedAt: new Date(),
          },
        });
        this.logger.log(`Report ${report.id} → ${result.disease} (${result.confidence}%)`);
        this.fanOut(updated);
      } else {
```

- [ ] **Step 2: Add fanOut() and handleClientDiagnosis() methods**

Find the end of the `run()` method (the closing `}` of the private `run` method, before the final class closing brace). Add these two methods immediately after `run()`:

```ts
  /**
   * Side-effects shared by both the HF success path and the trusted-cloud path:
   * realtime broadcast, outbreak detection, and high-severity notification
   * fanout. All best-effort; failures are logged, never thrown.
   */
  private fanOut(report: Report): void {
    this.realtime.reportCreated(report);
    void this.outbreak.handleNewReport(report).catch((err) => {
      this.logger.error('Outbreak processing failed', err as Error);
    });
    if (report.severity === Severity.HIGH) {
      void this.fanout.handleHighSeverityReport(report).catch((err) => {
        this.logger.warn(`High-severity report fanout failed: ${(err as Error).message}`);
      });
    }
  }

  /**
   * A report created with a trusted `cloud` diagnosis is already SUCCESS — HF
   * ran on the client's behalf via /diseases/analyze. Skip re-running HF and
   * just fan out. Fire-and-forget so the HTTP response isn't blocked.
   */
  handleClientDiagnosis(report: Report): void {
    this.fanOut(report);
  }
```

- [ ] **Step 3: Typecheck (Task 6 + 7 together)**

Run: `pnpm --filter backend typecheck`
Expected: PASS — `handleClientDiagnosis` now exists and `fanOut` is used by both paths.

- [ ] **Step 4: Run the full backend suite**

Run: `pnpm --filter backend jest`
Expected: PASS — all prior tests plus the new diseases + DTO tests stay green.

- [ ] **Step 5: Commit (Tasks 6 + 7)**

```bash
git add apps/backend/src/modules/reports/reports.service.ts apps/backend/src/modules/reports/reports.processor.ts
git commit -m "feat(reports): store trusted cloud diagnosis, upgrade provisional via HF"
```

### Task 8: Backend lint + live smoke test of /diseases/analyze

**Files:** none (verification only)

- [ ] **Step 1: Lint the backend**

Run: `pnpm --filter backend lint`
Expected: 0 errors (warnings tolerated; fix any new errors introduced).

- [ ] **Step 2: Live smoke test the endpoint**

Ensure the backend is running (`pnpm --filter backend dev`) and you have a JWT (log in via the app, or reuse a dev token). Then, with a public image URL (any Cloudinary leaf image or a public test image), run from PowerShell:

```powershell
$token = "<paste a valid JWT>"
$body = @{ imageUrl = "https://res.cloudinary.com/djbc9uuo0/image/upload/sample.jpg" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/diseases/analyze" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 8
```

Expected: a JSON object with `status: "ok"` (disease/confidence/severity/advisory) or `status: "retake"` (guidance). A 401 means the token is missing/expired; a 503 means HF was unreachable (the client fallback path).

- [ ] **Step 3: No commit** (verification only). Record the observed response shape for the mobile API client in Phase 3.

---

## Phase 3 — Mobile: API client + types + create-report

### Task 9: Mobile API client for analyze + upload delete

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/api/analyze.api.ts`
- Modify: `apps/mobile/src/features/disease-analysis/api/index.ts`
- Modify: `apps/mobile/src/features/upload-report/api/cloudinary.api.ts`

- [ ] **Step 1: Create the analyze API module**

Create `apps/mobile/src/features/disease-analysis/api/analyze.api.ts`:

```ts
import { apiClient } from '@/services/api/client';
import type { ApiResponse } from '@/types/api';

import type { ReportAdvisory, Severity } from '@/features/upload-report/types';

/** Mirrors the backend AnalyzeOk shape. */
export interface AnalyzeOkResponse {
  status: 'ok';
  engine: 'cloud';
  disease: string;
  confidence: number; // 0-100
  severity: Severity;
  recommendations: string[];
  detectedCrop?: string;
  advisory?: ReportAdvisory;
}

/** Mirrors the backend AnalyzeRetake shape. */
export interface AnalyzeRetakeResponse {
  status: 'retake';
  guidance: string;
  advisory?: ReportAdvisory;
}

export type AnalyzeResponse = AnalyzeOkResponse | AnalyzeRetakeResponse;

export const diseaseAnalyzeApi = {
  /**
   * Runs HF on an already-uploaded Cloudinary image. Throws on network/5xx
   * (the caller falls back to the on-device model). The backend's global
   * TransformInterceptor wraps the payload in the { success, data } envelope,
   * so we unwrap data.data (same as reportsApi).
   */
  async analyze(imageUrl: string): Promise<AnalyzeResponse> {
    const { data } = await apiClient.post<ApiResponse<AnalyzeResponse>>('/diseases/analyze', {
      imageUrl,
    });
    return data.data;
  },
};
```

> Verified: the backend `TransformInterceptor` is global (see `apps/backend/src/common/interceptors/transform.interceptor.ts`); every response is `{ success, data, timestamp }`. The smoke test in Task 8 will confirm the body shape — it must match `ApiResponse<AnalyzeResponse>`.

- [ ] **Step 2: Export from the api barrel**

In `apps/mobile/src/features/disease-analysis/api/index.ts`, it currently reads:

```ts
export * from './disease.api';
```

Change to:

```ts
export * from './disease.api';
export * from './analyze.api';
```

- [ ] **Step 3: Add a delete-asset call to the cloudinary API**

Read `apps/mobile/src/features/upload-report/api/cloudinary.api.ts` first to match its style, then add a `deleteAsset` method that calls the backend's `DELETE /uploads/:publicId`. Append inside the exported `cloudinaryApi` object:

```ts
  /**
   * Best-effort delete of an uploaded asset (used on forced retake / abandon).
   * The publicId can contain slashes, so it's URL-encoded into the path.
   */
  async deleteAsset(publicId: string): Promise<void> {
    await apiClient.delete(`/uploads/${encodeURIComponent(publicId)}`);
  },
```

> If `apiClient` is not already imported in `cloudinary.api.ts`, add `import { apiClient } from '@/services/api/client';`. Verify the file's existing import style when editing.

- [ ] **Step 4: Mobile typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS (types resolve; `ReportAdvisory` and `Severity` already exist in `upload-report/types`).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/api/ apps/mobile/src/features/upload-report/api/cloudinary.api.ts
git commit -m "feat(mobile): add diseases/analyze + upload delete API clients"
```

---

## Phase 4 — Mobile: types + create-report wiring

### Task 10: Extend mobile types for the diagnosis payload

`ReportDraft` and `QueueItem` must carry the provisional diagnosis so the offline drainer can forward it on sync. The report-flow `AnalysisResult` must carry the full advisory and engine.

**Files:**
- Modify: `apps/mobile/src/features/upload-report/types.ts`
- Modify: `apps/mobile/src/features/report-flow/types.ts`

- [ ] **Step 1: Add a shared diagnosis payload type to upload-report/types.ts**

In `apps/mobile/src/features/upload-report/types.ts`, add this interface near the top (after the `Severity` type alias):

```ts
/** Engine that produced a diagnosis. */
export type DiagnosisEngine = 'cloud' | 'on-device' | 'manual';

/**
 * Pre-computed diagnosis attached to a report on create. `cloud` is trusted and
 * stored as SUCCESS; `on-device`/`manual` are provisional and upgraded by HF.
 */
export interface DiagnosisPayload {
  disease?: string;
  confidence?: number; // 0-100
  severity?: Severity;
  advisory?: ReportAdvisory;
  engine: DiagnosisEngine;
}
```

- [ ] **Step 2: Add diagnosis to ReportDraft**

In the same file, find the `ReportDraft` interface and add a `diagnosis` field:

```ts
export interface ReportDraft {
  cropTypeId: string;
  cropTypeName: string;
  notes?: string;
  location: ReportLocation;
  localImageUri: string;
  /** Idempotency key sent to the backend. Same key on retry → same Report row. */
  clientId: string;
  /** Provisional on-device/manual diagnosis to forward when the report syncs. */
  diagnosis?: DiagnosisPayload;
}
```

- [ ] **Step 3: Align report-flow AnalysisResult**

In `apps/mobile/src/features/report-flow/types.ts`, replace the `AnalysisResult` interface so it carries the full advisory and confidence in 0-100 (matching the backend), plus the engine. Replace:

```ts
export interface AnalysisResult {
  engine: AnalysisEngine;
  /** Diagnosed disease (e.g., "Tomato leaf curl"). May be null in manual mode. */
  disease: string | null;
  /** 0..1 confidence from the engine. Null in manual mode. */
  confidence: number | null;
  severity: Severity | null;
  /** Treatment / action recommendations rendered as a numbered list. */
  recommendations: string[];
  /** Optional alternate candidates when confidence is low (<0.6). */
  candidates?: { disease: string; confidence: number }[];
  /** Free text from the engine (e.g., "Spreading", "Localized"). */
  status?: 'spreading' | 'localized' | 'contained';
  /** Set by the user via "Edit details". When true, badge becomes "Edited by you". */
  edited?: boolean;
}
```

with:

```ts
import type { ReportAdvisory } from '@/features/upload-report/types';

export interface AnalysisResult {
  engine: AnalysisEngine;
  /** Diagnosed disease display name. Null in manual mode. */
  disease: string | null;
  /** 0-100 confidence. Null in manual mode. */
  confidence: number | null;
  severity: Severity | null;
  /** Detected crop (HF or on-device). Used to pre-fill / correct cropType. */
  detectedCrop?: string;
  /** Full farmer-facing advisory when the engine supplies one (HF). */
  advisory?: ReportAdvisory;
}
```

> This removes `candidates`, `status`, and `edited` (the old low-confidence picker and edit-badge are dropped in the rework). `LOW_CONFIDENCE_THRESHOLD` is no longer used — remove its export at the bottom of the file.

- [ ] **Step 4: Remove the now-unused AnalysisEngine 'manual' copy dependency check**

`AnalysisEngine` stays as `'cloud' | 'on-device' | 'manual'` (unchanged). Confirm the top of `report-flow/types.ts` still exports it.

- [ ] **Step 5: Mobile typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: FAIL — existing consumers of the removed fields (`result-screen.tsx`, `engine-badge`, `edit-details-sheet`, `use-report-flow.ts`) now have type errors. This is expected; those files are replaced/deleted in Phase 5–6. (Do not commit yet; this task lands with Phase 5.)

> If you want a clean commit boundary, you may stash this and apply it at the start of Phase 5. Otherwise proceed directly to Task 11.

### Task 11: useCreateReport forwards diagnosis + skips re-upload

`submit()` must accept a pre-uploaded image (`imageUrl`/`imagePublicId`) and a `DiagnosisPayload`, forward them to the backend, and enqueue the diagnosis when offline.

**Files:**
- Modify: `apps/mobile/src/features/upload-report/hooks/use-create-report.ts`
- Modify: `apps/mobile/src/features/upload-report/api/reports.api.ts`

- [ ] **Step 1: Extend the reports API payload**

In `apps/mobile/src/features/upload-report/api/reports.api.ts`, replace the `CreateReportPayload` interface:

```ts
interface CreateReportPayload {
  /** Optional idempotency key. Same key + same user = no duplicate. */
  clientId?: string;
  cropType: string;
  imageUrl: string;
  imagePublicId: string;
  notes?: string;
  latitude: number;
  longitude: number;
  /** Optional pre-diagnosed disease (from the report-flow's cloud/on-device AI). */
  diseaseHint?: string;
  /** Optional pre-diagnosed severity. */
  severityHint?: 'LOW' | 'MEDIUM' | 'HIGH';
  /** When false, the report is created privately and not added to the public outbreak map. */
  shareToMap?: boolean;
}
```

with:

```ts
import type { ReportAdvisory, Severity } from '../types';

interface CreateReportPayload {
  /** Optional idempotency key. Same key + same user = no duplicate. */
  clientId?: string;
  cropType: string;
  imageUrl: string;
  imagePublicId: string;
  notes?: string;
  latitude: number;
  longitude: number;
  /** Pre-computed diagnosis (capture→review flow). */
  disease?: string;
  confidence?: number;
  severity?: Severity;
  advisory?: ReportAdvisory;
  engine?: 'cloud' | 'on-device' | 'manual';
}
```

> Remove the old `diseaseHint`/`severityHint`/`shareToMap` fields — they were never honored by the backend and are replaced by the real diagnosis fields. Verify no other caller references them (grep `diseaseHint` across `apps/mobile/src`).

- [ ] **Step 2: Note continues in Task 11 Step 3** (use-create-report edits below).

- [ ] **Step 3: Extend CreateReportInput**

In `apps/mobile/src/features/upload-report/hooks/use-create-report.ts`, replace the `CreateReportInput` interface:

```ts
interface CreateReportInput {
  picked: PickedImage;
  cropTypeId: string;
  cropTypeName: string;
  notes?: string;
  location: { latitude: number; longitude: number; manual?: boolean };
  /** When true, skip the network and enqueue offline. */
  forceOffline?: boolean;
  /** Optional pre-diagnosed disease (e.g., from cloud/on-device AI in the report flow). */
  diseaseHint?: string;
  /** Optional pre-diagnosed severity. */
  severityHint?: Severity;
  /** When false, the report is created privately and not added to the public outbreak map. */
  shareToMap?: boolean;
  /**
   * When true, the hook does not auto-navigate on success — the caller
   * (e.g., the report-flow state machine) will handle navigation itself.
   */
  skipNavigation?: boolean;
}
```

with:

```ts
interface CreateReportInput {
  picked: PickedImage;
  cropTypeId: string;
  cropTypeName: string;
  notes?: string;
  location: { latitude: number; longitude: number; manual?: boolean };
  /** When true, skip the network and enqueue offline. */
  forceOffline?: boolean;
  /** Pre-computed diagnosis from the capture→review flow. */
  diagnosis?: DiagnosisPayload;
  /**
   * Image already uploaded to Cloudinary by the flow (the analyze step). When
   * present, the upload step is skipped and these are sent directly.
   */
  preUploaded?: { imageUrl: string; imagePublicId: string };
  /**
   * When true, the hook does not auto-navigate on success — the caller
   * (e.g., the report-flow state machine) will handle navigation itself.
   */
  skipNavigation?: boolean;
}
```

Update the import line to pull in `DiagnosisPayload` (add it to the existing type import from `../types`):

```ts
import type {
  DiagnosisPayload,
  PickedImage,
  Report,
  ReportDraft,
  ReportLocation,
  UploadState,
} from '../types';
```

(`Severity` is no longer referenced directly here — remove it from the import if unused after this change.)

- [ ] **Step 4: Persist diagnosis into the draft**

Find where the `draft` is built in `submit()`:

```ts
      const draft: ReportDraft = {
        cropTypeId: input.cropTypeId,
        cropTypeName: input.cropTypeName,
        notes: input.notes,
        location: reportLocation,
        localImageUri: persistentUri,
        clientId,
      };
```

Replace with:

```ts
      const draft: ReportDraft = {
        cropTypeId: input.cropTypeId,
        cropTypeName: input.cropTypeName,
        notes: input.notes,
        location: reportLocation,
        localImageUri: persistentUri,
        clientId,
        diagnosis: input.diagnosis,
      };
```

- [ ] **Step 5: Skip upload when preUploaded, and forward diagnosis on create**

Find the upload + create block (Step 2 + Step 3 in the hook). Replace:

```ts
      // Step 2 — upload to Cloudinary
      setState('uploading');
      let uploadResult;
      try {
        const sig = await cloudinaryApi.getSignature();
        uploadResult = await cloudinaryApi.uploadImage(persistentUri, sig, (p) => setProgress(p));
      } catch (err) {
        // Network or Cloudinary failure → enqueue for offline retry
        await enqueue({
          id: itemId,
          draft,
          status: 'pending',
          attempts: 0,
          lastError: (err as Error).message,
          createdAt: new Date().toISOString(),
        });
        setState('queued-offline');
        return undefined;
      }

      // Step 3 — backend report creation
      setState('processing');
      try {
        const created = await reportsApi.create({
          clientId: draft.clientId,
          cropType: draft.cropTypeName,
          imageUrl: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
          notes: draft.notes,
          latitude: draft.location.latitude,
          longitude: draft.location.longitude,
          // Pass through report-flow hints. The backend may ignore unknown
          // fields today; this is a best-effort propagation so the diagnosis
          // surfaces as soon as the API supports it.
          diseaseHint: input.diseaseHint,
          severityHint: input.severityHint,
          shareToMap: input.shareToMap,
        });
```

with:

```ts
      // Step 2 — upload to Cloudinary (skipped when the flow already uploaded it)
      setState('uploading');
      let imageUrl: string;
      let imagePublicId: string;
      if (input.preUploaded) {
        imageUrl = input.preUploaded.imageUrl;
        imagePublicId = input.preUploaded.imagePublicId;
      } else {
        try {
          const sig = await cloudinaryApi.getSignature();
          const uploadResult = await cloudinaryApi.uploadImage(persistentUri, sig, (p) =>
            setProgress(p),
          );
          imageUrl = uploadResult.secure_url;
          imagePublicId = uploadResult.public_id;
        } catch (err) {
          // Network or Cloudinary failure → enqueue for offline retry
          await enqueue({
            id: itemId,
            draft,
            status: 'pending',
            attempts: 0,
            lastError: (err as Error).message,
            createdAt: new Date().toISOString(),
          });
          setState('queued-offline');
          return undefined;
        }
      }

      // Step 3 — backend report creation
      setState('processing');
      try {
        const created = await reportsApi.create({
          clientId: draft.clientId,
          cropType: draft.cropTypeName,
          imageUrl,
          imagePublicId,
          notes: draft.notes,
          latitude: draft.location.latitude,
          longitude: draft.location.longitude,
          disease: input.diagnosis?.disease,
          confidence: input.diagnosis?.confidence,
          severity: input.diagnosis?.severity,
          advisory: input.diagnosis?.advisory,
          engine: input.diagnosis?.engine,
        });
```

> The `forceOffline` enqueue block earlier in `submit()` already stores `draft` (now including `diagnosis`), so no change is needed there.

- [ ] **Step 6: Mobile typecheck (expect partial)**

Run: `pnpm --filter mobile typecheck`
Expected: errors remain only in the to-be-replaced flow screens (Phase 5/6). The `use-create-report` and API modules themselves should be error-free.

- [ ] **Step 7: No commit yet** — lands with Phase 5/6 once the flow compiles.

### Task 12: Offline drainer forwards the diagnosis on sync

When a queued (offline) report drains, send its provisional diagnosis so the backend stores it as `on-device` and upgrades via HF.

**Files:**
- Modify: `apps/mobile/src/features/upload-report/hooks/use-offline-queue.ts`

- [ ] **Step 1: Forward the diagnosis in processItem**

In `apps/mobile/src/features/upload-report/hooks/use-offline-queue.ts`, find the `reportsApi.create({...})` call inside `processItem`:

```ts
    const created = await reportsApi.create({
      clientId: item.draft.clientId,
      cropType: item.draft.cropTypeName,
      imageUrl,
      imagePublicId,
      notes: item.draft.notes,
      latitude: item.draft.location.latitude,
      longitude: item.draft.location.longitude,
    });
```

Replace with:

```ts
    const created = await reportsApi.create({
      clientId: item.draft.clientId,
      cropType: item.draft.cropTypeName,
      imageUrl,
      imagePublicId,
      notes: item.draft.notes,
      latitude: item.draft.location.latitude,
      longitude: item.draft.location.longitude,
      // Provisional on-device/manual diagnosis captured while offline. The
      // backend stores it and re-runs HF to upgrade (engine !== 'cloud').
      disease: item.draft.diagnosis?.disease,
      confidence: item.draft.diagnosis?.confidence,
      severity: item.draft.diagnosis?.severity,
      advisory: item.draft.diagnosis?.advisory,
      engine: item.draft.diagnosis?.engine,
    });
```

- [ ] **Step 2: Mobile typecheck (still expect Phase 5/6 errors)**

Run: `pnpm --filter mobile typecheck`
Expected: only flow-screen errors remain.

- [ ] **Step 3: No commit yet** — lands with Phase 5/6.

---

## Phase 5 — Mobile: orchestrator state machine

### Task 13: Rewrite use-report-flow.ts (upload → HF → fallback)

Replace the whole orchestrator. New step set: `capture → analyzing → (retake | result) → submitted`. After capture it uploads to Cloudinary, then (if online) calls `/diseases/analyze`; on retake it shows the retake screen and deletes the asset; on success it shows the result; on failure/offline it runs the on-device model.

**Files:**
- Modify (full replace): `apps/mobile/src/features/report-flow/use-report-flow.ts`
- Modify: `apps/mobile/src/features/report-flow/types.ts` (FlowStep + FlowState)

- [ ] **Step 1: Update FlowStep and FlowState in types.ts**

In `apps/mobile/src/features/report-flow/types.ts`, replace:

```ts
export type FlowStep = 'capture' | 'analyzing' | 'result' | 'submitted';
```

with:

```ts
export type FlowStep = 'capture' | 'analyzing' | 'retake' | 'result' | 'submitted';
```

Then replace the `FlowState` interface:

```ts
export interface FlowState {
  step: FlowStep;
  image: CapturedImage | null;
  cropType: string | null;
  notes: string;
  location: FlowLocation | null;
  result: AnalysisResult | null;
  /** When true, the report is submitted publicly to the outbreak map. */
  shareToMap: boolean;
  /** Diagnostic info on submission. */
  submittedReportId: string | null;
}
```

with:

```ts
export interface UploadedImage {
  imageUrl: string;
  imagePublicId: string;
}

export interface FlowState {
  step: FlowStep;
  image: CapturedImage | null;
  /** Cloudinary asset, set after the post-capture upload. */
  uploaded: UploadedImage | null;
  /** Detected/corrected crop shown on the result screen. */
  cropType: string | null;
  notes: string;
  location: FlowLocation | null;
  result: AnalysisResult | null;
  /** Guidance shown on the forced-retake screen (online HF only). */
  retakeGuidance: string | null;
  submittedReportId: string | null;
}
```

- [ ] **Step 2: Replace use-report-flow.ts entirely**

Replace the full contents of `apps/mobile/src/features/report-flow/use-report-flow.ts` with:

```ts
import { useCallback, useReducer, useRef } from 'react';

import { diseaseAnalyzeApi } from '@/features/disease-analysis/api';
import { offlineAiClient } from '@/features/offline-ai';
import { useNetworkStore } from '@/features/offline-sync/store/network.store';
import { cloudinaryApi } from '@/features/upload-report/api/cloudinary.api';
import { useCreateReport } from '@/features/upload-report/hooks/use-create-report';
import type { DiagnosisPayload, Severity } from '@/features/upload-report/types';
import { logger } from '@/utils/logger';

import type {
  AnalysisResult,
  CapturedImage,
  FlowLocation,
  FlowState,
  FlowStep,
  UploadedImage,
} from './types';

type Action =
  | { type: 'SET_IMAGE'; image: CapturedImage }
  | { type: 'SET_UPLOADED'; uploaded: UploadedImage }
  | { type: 'SET_STEP'; step: FlowStep }
  | { type: 'SET_RESULT'; result: AnalysisResult; cropType: string | null }
  | { type: 'SET_RETAKE'; guidance: string }
  | { type: 'SET_CROP'; cropType: string }
  | { type: 'SET_LOCATION'; location: FlowLocation | null }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_SUBMITTED'; reportId: string }
  | { type: 'RESET' };

const initialState: FlowState = {
  step: 'capture',
  image: null,
  uploaded: null,
  cropType: null,
  notes: '',
  location: null,
  result: null,
  retakeGuidance: null,
  submittedReportId: null,
};

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case 'SET_IMAGE':
      return { ...state, image: action.image, step: 'analyzing', result: null, retakeGuidance: null };
    case 'SET_UPLOADED':
      return { ...state, uploaded: action.uploaded };
    case 'SET_STEP':
      return { ...state, step: action.step };
    case 'SET_RESULT':
      return { ...state, result: action.result, cropType: action.cropType, step: 'result' };
    case 'SET_RETAKE':
      return { ...state, retakeGuidance: action.guidance, step: 'retake' };
    case 'SET_CROP':
      return { ...state, cropType: action.cropType };
    case 'SET_LOCATION':
      return { ...state, location: action.location };
    case 'SET_NOTES':
      return { ...state, notes: action.notes };
    case 'SET_SUBMITTED':
      return { ...state, step: 'submitted', submittedReportId: action.reportId };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

/** Maps the report-flow engine to the create-report diagnosis engine. */
function toDiagnosis(result: AnalysisResult): DiagnosisPayload {
  return {
    disease: result.disease ?? undefined,
    confidence: result.confidence ?? undefined,
    severity: (result.severity ?? undefined) as Severity | undefined,
    advisory: result.advisory,
    engine: result.engine,
  };
}

export function useReportFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const create = useCreateReport();
  // Monotonic token so a slow analysis can't dispatch onto a fresh capture.
  const runTokenRef = useRef(0);

  const runOnDevice = useCallback(
    async (image: CapturedImage, isStale: () => boolean): Promise<void> => {
      try {
        if (await offlineAiClient.isAvailable()) {
          const r = await offlineAiClient.analyze({ localImageUri: image.uri, cropType: '' });
          if (isStale()) return;
          if (r.ok) {
            dispatch({
              type: 'SET_RESULT',
              result: {
                engine: 'on-device',
                disease: r.disease,
                // on-device confidence is 0-1; normalize to 0-100.
                confidence: Math.round(r.confidence * 100),
                severity: r.severity,
                detectedCrop: undefined,
              },
              cropType: null,
            });
            return;
          }
        }
      } catch (err) {
        logger.warn('[report-flow] on-device analyze failed', err);
      }
      if (isStale()) return;
      // Manual last resort — empty diagnosis, farmer fills crop on the result screen.
      dispatch({
        type: 'SET_RESULT',
        result: { engine: 'manual', disease: null, confidence: null, severity: null },
        cropType: null,
      });
    },
    [],
  );

  const runAnalysis = useCallback(
    async (image: CapturedImage) => {
      const token = ++runTokenRef.current;
      const isStale = () => runTokenRef.current !== token;

      const online = useNetworkStore.getState().isConnected;

      // 1) Upload to Cloudinary so the backend (and a confirmed report) can use it.
      let uploaded: UploadedImage | null = null;
      if (online) {
        try {
          const sig = await cloudinaryApi.getSignature();
          const up = await cloudinaryApi.uploadImage(image.uri, sig);
          uploaded = { imageUrl: up.secure_url, imagePublicId: up.public_id };
          if (isStale()) return;
          dispatch({ type: 'SET_UPLOADED', uploaded });
        } catch (err) {
          logger.warn('[report-flow] upload failed, falling back to on-device', err);
        }
      }

      // 2) If we have an uploaded image, run HF. Otherwise straight to on-device.
      if (uploaded) {
        try {
          const res = await diseaseAnalyzeApi.analyze(uploaded.imageUrl);
          if (isStale()) return;
          if (res.status === 'retake') {
            // Forced retake (online HF only). Clean up the rejected asset.
            void cloudinaryApi.deleteAsset(uploaded.imagePublicId).catch(() => undefined);
            dispatch({ type: 'SET_RETAKE', guidance: res.guidance });
            return;
          }
          dispatch({
            type: 'SET_RESULT',
            result: {
              engine: 'cloud',
              disease: res.disease,
              confidence: res.confidence,
              severity: res.severity,
              detectedCrop: res.detectedCrop,
              advisory: res.advisory,
            },
            cropType: res.detectedCrop ?? null,
          });
          return;
        } catch (err) {
          logger.warn('[report-flow] HF analyze failed, falling back to on-device', err);
        }
      }

      // 3) Fallback — on-device on the local image.
      if (isStale()) return;
      await runOnDevice(image, isStale);
    },
    [runOnDevice],
  );

  const setImage = useCallback(
    (image: CapturedImage) => {
      dispatch({ type: 'SET_IMAGE', image });
      void runAnalysis(image);
    },
    [runAnalysis],
  );

  const retake = useCallback(() => {
    runTokenRef.current += 1;
    dispatch({ type: 'SET_STEP', step: 'capture' });
  }, []);

  const submit = useCallback(async () => {
    if (!state.image || !state.location || !state.result) return;
    const cropType = state.cropType ?? state.result.detectedCrop ?? 'Unknown';
    const reportId = await create.submit({
      picked: { uri: state.image.uri, width: state.image.width, height: state.image.height },
      cropTypeId: cropType,
      cropTypeName: cropType,
      notes: state.notes.trim() || undefined,
      location: state.location,
      diagnosis: toDiagnosis(state.result),
      preUploaded: state.uploaded ?? undefined,
      skipNavigation: true,
    });
    if (reportId) dispatch({ type: 'SET_SUBMITTED', reportId });
  }, [state, create]);

  return {
    state,
    setImage,
    retake,
    setStep: (step: FlowStep) => dispatch({ type: 'SET_STEP', step }),
    setCrop: (cropType: string) => dispatch({ type: 'SET_CROP', cropType }),
    setLocation: (location: FlowLocation | null) => dispatch({ type: 'SET_LOCATION', location }),
    setNotes: (notes: string) => dispatch({ type: 'SET_NOTES', notes }),
    submit,
    create,
    reset: () => {
      runTokenRef.current += 1;
      dispatch({ type: 'RESET' });
    },
  };
}

export type UseReportFlow = ReturnType<typeof useReportFlow>;
```

> Behavior notes for the implementer:
> - Connectivity is read once at analysis start via `useNetworkStore.getState().isConnected` (no re-render dependency needed inside the async fn).
> - Offline = no `uploaded` → on-device path → report queued with `engine: 'on-device'` → backend upgrades on sync (Task 12).
> - `ENGINE_COPY` was exported from this file before; it's recreated in the analyzing screen (Task 15). Remove any remaining `ENGINE_COPY` export here.

- [ ] **Step 3: No commit yet** — screens still reference old exports; lands at end of Phase 6.

---

## Phase 6 — Mobile: rebuilt UI screens

### Task 14: Capture screen — drop the step counter, keep camera

The existing `capture-screen.tsx` already works (camera + gallery). The only change: it no longer needs a crop pre-step, and the "Step 1 of 4" label is misleading now (the flow is capture → analyzing → result). Update the labels to remove the "of 4" framing.

**Files:**
- Modify: `apps/mobile/src/features/report-flow/screens/capture-screen.tsx`

- [ ] **Step 1: Replace the two "Step 1 of 4" labels**

There are two occurrences (permission screen and camera overlay). Replace both label texts `Step 1 of 4` with `Photograph crop`. The `onCaptured` signature stays `(image: CapturedImage) => void` — it already matches the new `setImage(image)` (no cropType arg). No other change needed.

- [ ] **Step 2: Mobile typecheck (still expect downstream errors)**

Run: `pnpm --filter mobile typecheck`
Expected: capture-screen itself is clean.

### Task 15: Analyzing screen — honest loading with cold-start copy

**Files:**
- Modify (full replace): `apps/mobile/src/features/report-flow/screens/analyzing-screen.tsx`

- [ ] **Step 1: Read the existing screen** to match imports/props, then replace its full contents with:

```tsx
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/ui/loader';
import { Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
}

const STATUS_COPY = [
  'Uploading photo…',
  'Detecting crop…',
  'Checking for disease…',
  'Preparing advisory…',
];

const COLD_START_AFTER_MS = 6000;

/**
 * Loading screen shown while the report is uploaded and analyzed. Rotates
 * honest status copy and, after a few seconds with no result, surfaces a
 * cold-start note (the HF space may be waking up).
 */
export function AnalyzingScreen({ image }: Props) {
  const [copyIndex, setCopyIndex] = useState(0);
  const [coldStart, setColdStart] = useState(false);

  useEffect(() => {
    const rotate = setInterval(() => {
      setCopyIndex((i) => (i + 1) % STATUS_COPY.length);
    }, 1800);
    const cold = setTimeout(() => setColdStart(true), COLD_START_AFTER_MS);
    return () => {
      clearInterval(rotate);
      clearTimeout(cold);
    };
  }, []);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <View className="overflow-hidden rounded-3xl" style={{ width: 180, height: 180 }}>
            <Image source={{ uri: image.uri }} style={{ width: 180, height: 180 }} contentFit="cover" />
          </View>
          <Loader size={40} />
          <Animated.View key={copyIndex} entering={FadeIn.duration(300)}>
            <Text className="text-center text-base font-bold text-text">{STATUS_COPY[copyIndex]}</Text>
          </Animated.View>
          {coldStart ? (
            <Text className="text-center text-sm text-text-muted">
              The AI is waking up — this can take a moment the first time.
            </Text>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
```

> If `Loader` is not at `@/components/ui/loader`, use the same loader import the old screen used. Verify before writing.

### Task 16: Retake screen (new)

**Files:**
- Create: `apps/mobile/src/features/report-flow/screens/retake-screen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { Image } from 'expo-image';
import { Camera as CameraIcon, RefreshCw } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
  guidance: string;
  onRetake: () => void;
}

/**
 * Shown when HF reports the photo is unusable / no reliable diagnosis (online
 * path only). Forces a retake — there is no "use anyway" override, so junk
 * diagnoses never reach the outbreak map.
 */
export function RetakeScreen({ image, guidance, onRetake }: Props) {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <Animated.View entering={FadeInDown.duration(300)} className="items-center gap-5">
            <View className="overflow-hidden rounded-3xl opacity-60" style={{ width: 140, height: 140 }}>
              <Image source={{ uri: image.uri }} style={{ width: 140, height: 140 }} contentFit="cover" />
            </View>
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-warning-tint">
              <RefreshCw size={26} color={palette.status.warning} strokeWidth={2.2} />
            </View>
            <Text className="text-center text-lg font-extrabold text-text">Let&apos;s try that again</Text>
            <Text className="text-center text-sm leading-5 text-text-muted">{guidance}</Text>
          </Animated.View>
        </View>
        <View className="px-4 pb-3">
          <Button
            label="Retake photo"
            variant="gradient"
            size="lg"
            onPress={onRetake}
            leftSlot={<CameraIcon size={18} color="#ffffff" strokeWidth={2.4} />}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
```

> Verify `Button` supports a `leftSlot` prop; if not, drop the `leftSlot` line (check `@/components/ui/button`).

- [ ] **Step 2: No commit yet** — wired in Task 18.

### Task 17: Result screen — layout B (triage answer + expandable detail)

Rebuild the result screen as the approved layout B: an answer card (image, crop + confidence + engine badge, disease, severity + urgency pills, and the #1 action), an optional crop-correction control, expandable advisory detail (reusing `DiseaseAdvisory`), and a sticky Confirm button.

**Files:**
- Create (replace old): `apps/mobile/src/features/report-flow/screens/result-screen.tsx`

- [ ] **Step 1: Replace result-screen.tsx contents**

```tsx
import { Image } from 'expo-image';
import { ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { DiseaseAdvisory } from '@/features/disease-analysis/components/disease-advisory';
import { SeverityBadge } from '@/features/disease-analysis/components/severity-badge';
import { Text, View } from '@/tw';

import type { AnalysisResult, CapturedImage } from '../types';

interface Props {
  image: CapturedImage;
  result: AnalysisResult;
  cropType: string | null;
  submitting: boolean;
  onConfirm: () => void;
}

const ENGINE_LABEL: Record<AnalysisResult['engine'], string> = {
  cloud: 'Cloud AI',
  'on-device': 'On-device',
  manual: 'Manual entry',
};

/** First recommended action, surfaced inline as "DO THIS FIRST". */
function firstAction(result: AnalysisResult): string | null {
  const list = result.advisory?.whatToDoNow?.length
    ? result.advisory.whatToDoNow
    : result.advisory?.rag.immediateActions ?? [];
  return list[0] ?? null;
}

/**
 * Layout B: triage answer up top, deeper advisory in expandable rows below.
 * The full advisory (symptoms, all steps, prevention, alternatives, expert
 * advice) is rendered by DiseaseAdvisory when present (cloud engine).
 */
export function ResultScreen({ image, result, cropType, submitting, onConfirm }: Props) {
  const action = firstAction(result);
  const displayName = result.advisory?.primaryDiagnosis.displayName ?? result.disease ?? 'Manual entry';
  const crop = cropType ?? result.detectedCrop ?? null;

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Answer card */}
          <Animated.View
            entering={FadeIn.duration(300)}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <View className="flex-row gap-3 p-3">
              <Image
                source={{ uri: image.uri }}
                style={{ width: 64, height: 64, borderRadius: 12 }}
                contentFit="cover"
              />
              <View className="flex-1 gap-1">
                <Text className="text-[11px] font-bold uppercase tracking-[1.2px] text-brand-700">
                  {crop ? `${crop} · ` : ''}
                  {result.confidence != null ? `${result.confidence}% · ` : ''}
                  {ENGINE_LABEL[result.engine]}
                </Text>
                <Text className="text-lg font-extrabold leading-tight tracking-tight text-text">
                  {displayName}
                </Text>
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <SeverityBadge severity={result.severity} />
                  {result.advisory?.urgency ? (
                    <Chip label={result.advisory.urgency} tone="warning" />
                  ) : null}
                </View>
              </View>
            </View>
            {action ? (
              <View className="border-t border-brand-100 bg-brand-50 px-3 py-2.5">
                <SectionLabel>Do this first</SectionLabel>
                <Text className="mt-0.5 text-sm font-semibold text-text">{action}</Text>
              </View>
            ) : null}
          </Animated.View>

          {/* Rich advisory (cloud engine) */}
          {result.advisory ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <DiseaseAdvisory advisory={result.advisory} />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text className="px-2 text-sm leading-5 text-text-muted">
                {result.engine === 'on-device'
                  ? 'Diagnosed offline. A full advisory will appear once this report syncs.'
                  : 'No automated diagnosis. Add details before submitting.'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        <View className="border-t border-border bg-surface px-4 py-3">
          <Button
            label={submitting ? 'Submitting…' : 'Confirm & submit'}
            variant="gradient"
            size="lg"
            loading={submitting}
            onPress={onConfirm}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}
```

> Crop correction: this version shows the detected crop in the eyebrow. A full crop-correction control (tap to open the existing `crop-picker-sheet`) is optional polish — if included, wire `setCrop` from the flow. Keep it out of the critical path for the first pass; note it as a follow-up.
> `DiseaseAdvisory` already exists (`features/disease-analysis/components/disease-advisory.tsx`) and renders urgency/symptoms/actions/prevention/alternatives/expert. Reusing it satisfies the "expandable detail" requirement without duplicating section rendering. If you want true tap-to-expand accordions, that's an enhancement on top of `DiseaseAdvisory`; the plan's baseline renders the sections expanded.

- [ ] **Step 2: No commit yet** — wired in Task 18.

### Task 18: Submitted screen + barrel + wire report.tsx

**Files:**
- Modify: `apps/mobile/src/features/report-flow/screens/submitted-screen.tsx`
- Modify: `apps/mobile/src/features/report-flow/index.ts`
- Modify: `apps/mobile/src/app/report.tsx`

- [ ] **Step 1: Update submitted-screen.tsx props**

Read the current `submitted-screen.tsx`. It currently takes `result`, `cropType`, `shareToMap`, `reportId`, `onAnother`. Remove `shareToMap` (dropped) and accept the simplified set. Update the `Props` interface to:

```tsx
interface Props {
  result: AnalysisResult;
  cropType: string | null;
  reportId: string | null;
  onAnother: () => void;
}
```

Remove any `shareToMap` usage in the body. If the component referenced `result.status` or `result.candidates` (removed fields), delete those references. Keep the rest (success confirmation + "view on map" / "new report" CTAs). Verify it compiles against the new `AnalysisResult`.

- [ ] **Step 2: Update the report-flow barrel**

Replace the contents of `apps/mobile/src/features/report-flow/index.ts`:

```ts
// NOTE: capture-screen is intentionally NOT re-exported here. It imports
// expo-camera, whose native module loads eagerly at import time. Import it
// lazily where needed instead (see screens/capture-lazy).
export * from './screens/analyzing-screen';
export * from './screens/retake-screen';
export * from './screens/result-screen';
export * from './screens/submitted-screen';
export * from './use-report-flow';
export * from './types';
```

> This drops the barrel exports for `engine-badge`, `recommendations-card`, `severity-pill`, `share-toggle-card`, and `edit-details-sheet` (deleted in Task 19).

- [ ] **Step 3: Rewrite report.tsx to drive the new state machine**

Replace the full contents of `apps/mobile/src/app/report.tsx`:

```tsx
import { router } from 'expo-router';
import { useEffect } from 'react';

import {
  AnalyzingScreen,
  ResultScreen,
  SubmittedScreen,
} from '@/features/report-flow';
import { CaptureScreen } from '@/features/report-flow/screens/capture-lazy';
import { RetakeScreen } from '@/features/report-flow/screens/retake-screen';
import { useReportFlow } from '@/features/report-flow/use-report-flow';
import { useCurrentLocation } from '@/features/upload-report/hooks';
import { View } from '@/tw';

/**
 * Full-screen report flow (root stack, outside the tab navigator). Drives:
 * Capture → Analyzing → (Retake | Result) → Submitted.
 *
 * Online: upload → HF via /diseases/analyze → review → confirm.
 * Offline / HF fails: on-device diagnosis → review → confirm → queued; the
 * backend upgrades the diagnosis to HF on sync.
 */
export default function ReportScreen() {
  const flow = useReportFlow();

  const locationCtl = useCurrentLocation(true);
  useEffect(() => {
    if (locationCtl.location) {
      flow.setLocation({
        latitude: locationCtl.location.latitude,
        longitude: locationCtl.location.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.setLocation is stable
  }, [locationCtl.location]);

  const submitting = flow.create.state === 'uploading' || flow.create.state === 'processing';

  let body: React.ReactNode = null;
  switch (flow.state.step) {
    case 'capture':
      body = <CaptureScreen onCaptured={flow.setImage} onCancel={flow.reset} />;
      break;
    case 'analyzing':
      body = flow.state.image ? <AnalyzingScreen image={flow.state.image} /> : <View />;
      break;
    case 'retake':
      body =
        flow.state.image && flow.state.retakeGuidance ? (
          <RetakeScreen
            image={flow.state.image}
            guidance={flow.state.retakeGuidance}
            onRetake={flow.retake}
          />
        ) : (
          <View />
        );
      break;
    case 'result':
      body =
        flow.state.image && flow.state.result ? (
          <ResultScreen
            image={flow.state.image}
            result={flow.state.result}
            cropType={flow.state.cropType}
            submitting={submitting}
            onConfirm={() => void flow.submit()}
          />
        ) : (
          <View />
        );
      break;
    case 'submitted':
      body = flow.state.result ? (
        <SubmittedScreen
          result={flow.state.result}
          cropType={flow.state.cropType}
          reportId={flow.state.submittedReportId}
          onAnother={() => {
            flow.reset();
            router.replace('/report');
          }}
        />
      ) : (
        <View />
      );
      break;
  }

  return <>{body}</>;
}
```

> `capture-lazy.tsx` already exists and lazy-loads `CaptureScreen`; keep using it. The old `EditDetailsSheet` is removed.

- [ ] **Step 4: No commit yet** — delete dead files first (Task 19), then typecheck the whole flow.

### Task 19: Delete dead report-flow files

**Files (delete):**
- `apps/mobile/src/features/report-flow/components/edit-details-sheet.tsx`
- `apps/mobile/src/features/report-flow/components/engine-badge.tsx`
- `apps/mobile/src/features/report-flow/components/recommendations-card.tsx`
- `apps/mobile/src/features/report-flow/components/severity-pill.tsx`
- `apps/mobile/src/features/report-flow/components/share-toggle-card.tsx`

- [ ] **Step 1: Confirm no remaining references**

Run (PowerShell, repo root):

```powershell
Select-String -Path "apps\mobile\src\**\*.ts","apps\mobile\src\**\*.tsx" -Pattern "edit-details-sheet|EngineBadge|RecommendationsCard|SeverityPill|ShareToggleCard|LOW_CONFIDENCE_THRESHOLD" -List | Select-Object -ExpandProperty Path
```

Expected: no results except the files about to be deleted. If `RecommendationsCard` is still referenced by `disease-analysis/components/recommendations-list.tsx`, that file imports from `@/features/report-flow` — check it. (The report detail screen uses `RecommendationsList` only in the non-advisory branch. If `recommendations-card` is deleted, move its small body into `recommendations-list.tsx` directly, or keep `recommendations-card.tsx` if still referenced. Decide based on grep output — do NOT delete a file with live references.)

- [ ] **Step 2: Delete the unreferenced files**

Delete only the files with zero live references (from Step 1). For any still referenced (likely `recommendations-card.tsx` via `recommendations-list.tsx`), inline its content into the consumer first, then delete.

```powershell
Remove-Item "apps\mobile\src\features\report-flow\components\edit-details-sheet.tsx"
Remove-Item "apps\mobile\src\features\report-flow\components\engine-badge.tsx"
Remove-Item "apps\mobile\src\features\report-flow\components\severity-pill.tsx"
Remove-Item "apps\mobile\src\features\report-flow\components\share-toggle-card.tsx"
# recommendations-card.tsx: only after confirming/relocating its single consumer
```

- [ ] **Step 3: Full mobile typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS — the entire rebuilt flow compiles (Tasks 10–19 resolve together).

- [ ] **Step 4: Commit the whole mobile rework (Tasks 10–19)**

```bash
git add apps/mobile/src
git commit -m "feat(mobile): rebuild capture→analyze→review flow (HF-first, on-device fallback)"
```

---

## Phase 7 — End-to-end verification

### Task 20: Full-stack verification

**Files:** none (verification only)

- [ ] **Step 1: Backend green**

Run: `pnpm --filter backend jest`
Expected: PASS — all suites (prior 58 + new hf.client, diseases.service, create-report.dto).

Run: `pnpm --filter backend typecheck`
Run: `pnpm --filter backend lint`
Run: `pnpm --filter backend build`
Expected: all clean (lint warnings tolerated, 0 errors).

- [ ] **Step 2: Mobile green**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.

- [ ] **Step 3: Manual device walkthrough (online)**

With `AI_PROVIDER=huggingface` and the backend running:
1. Open the app → Report tab → capture a clear leaf photo.
2. Confirm the analyzing screen shows rotating copy (and cold-start note if HF is asleep).
3. Confirm the result screen shows the answer card (crop · % · Cloud AI), severity + urgency pills, "Do this first", and the full advisory below.
4. Tap Confirm → submitted screen.
5. Open the report from history → confirm the same advisory renders and `processingStatus` is SUCCESS without a second HF call (check backend logs — no "Analyzing report" line for this report).

- [ ] **Step 4: Manual walkthrough (retake)**

Capture a deliberately bad photo (blurry / not a leaf). Confirm the Retake screen appears with guidance and only a Retake button (no override). Confirm the Cloudinary asset was deleted (backend `DELETE /uploads/...` logged).

- [ ] **Step 5: Manual walkthrough (offline)**

Enable airplane mode → capture. Confirm: on-device result appears (On-device badge), Confirm queues the report. Re-enable network → confirm the offline queue drains, and the report's diagnosis upgrades to a cloud advisory (open the report after sync; backend logs show "Analyzing report" → HF for that report).

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test: verify crop disease flow rework end-to-end"
```

---

## Appendix — Spec requirement coverage

| Spec requirement | Task(s) |
|---|---|
| `POST /diseases/analyze` (HF, authed, no report) | 1, 2, 3 |
| Retake detection (urgency / null disease) | 2 |
| Failure → non-2xx for client fallback | 2 |
| `DELETE /uploads/:publicId` cleanup | 4 |
| `CreateReportDto` diagnosis fields | 5 |
| Store trusted cloud diagnosis as SUCCESS, skip HF | 6, 7 |
| Upgrade on-device/manual via HF on the processor | 6, 7 |
| Mobile analyze + delete API clients | 9 |
| Mobile diagnosis/draft/queue types | 10 |
| `useCreateReport` forwards diagnosis + skips re-upload | 11 |
| Offline drainer forwards provisional diagnosis | 12 |
| Orchestrator: upload → HF → on-device → manual | 13 |
| Capture (no crop step) | 14 |
| Analyzing (honest cold-start) | 15 |
| Retake screen (forced, online only) | 16 |
| Result screen layout B (answer card + advisory) | 17 |
| Submitted + wiring + barrel | 18 |
| Drop dead screens / candidate picker / share toggle | 19 |
| End-to-end + offline upgrade verification | 20 |

