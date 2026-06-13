# Crop Disease Detection — Flow & UI Rework

**Date:** 2026-06-12
**Status:** Approved design, ready for implementation planning
**Author:** Brainstormed with user

## Problem

The crop disease detection feature works but the flow is incoherent and the UI predates the rich Hugging Face (HF) advisory model.

Today there are two parallel diagnosis paths that behave inconsistently:

- The `report-flow` capture screen runs the **on-device** TFLite model for an instant preview, then a now-removed cloud stage that called a non-existent endpoint with a local `file://` URI (never worked).
- The authoritative **HF** diagnosis runs **server-side** after `POST /reports`, surfaced only on the report detail screen via polling.

The result: the farmer sees a quick on-device guess in the capture flow, submits, then has to open a separate detail screen to get the real HF advisory. The two results can disagree. The crop picker is mandatory even though HF auto-detects the crop. The HF model is not preferred — on-device runs on every capture regardless of connectivity.

## Goals

1. **HF-first.** Use the HF model whenever it is reachable. Fall back to the on-device model only when the backend/HF call fails or the device is offline.
2. **One coherent flow.** The farmer sees a single diagnosis, reviews it, and confirms — diagnosis is attached to the report on submit.
3. **Rebuild the UI from the ground up.** Replace the old `report-flow` screens with a triage-first result experience built for the rich HF advisory.
4. **Offline reports upgrade automatically.** An on-device diagnosis made offline is replaced by the authoritative HF result when the report syncs.

## Non-goals

- Reworking the report detail screen (`reports/[id].tsx`) beyond what's needed to render the advisory (already done in the prior change).
- Hardening against client-spoofed diagnoses (see Risks — accepted for now).
- Changing the on-device model, its labels, or its preprocessing.
- Changing the outbreak / realtime / notification engines.

## End-to-end flow

```
Capture
  │
  ▼  upload image to Cloudinary (signed direct upload, existing path)
POST /diseases/analyze { imageUrl }
  │
  ├─ online + HF "retake"/no reliable diagnosis ─▶ Retake screen (forced, no override)
  │                                                  └─ delete Cloudinary asset ─▶ re-capture
  │
  ├─ online + HF ok ─▶ Result screen (engine: cloud) ─▶ correct crop? ─▶ Confirm
  │                                                                       └─ create report (reuse asset)
  │
  └─ backend/HF call fails OR device offline
        │
        ▼  on-device model runs on the LOCAL image (instant)
     Result screen (engine: on-device) ─▶ Confirm
        └─ report queued ─▶ on sync: backend re-runs HF ─▶ upgrades stored diagnosis
```

**Key rules:**

- The forced **retake gate applies only to the online HF path.** The on-device model never produces a "retake" verdict (it always returns a top prediction), so offline diagnoses pass through to the result screen normally.
- Online reports carry a `cloud` diagnosis and are **never re-analyzed** by HF on the backend (no double call).
- Offline/manual reports are re-analyzed by HF on sync — the existing async processor performs this **upgrade**.

## Architecture

### Backend

**1. New synchronous analyze endpoint — `POST /diseases/analyze`**

- New `DiseasesModule` with `DiseasesController` + `DiseasesService`, importing `AiModule`.
- Authed (global `JwtAuthGuard` applies; not marked `@Public()`).
- Request: `{ imageUrl: string }` (the Cloudinary URL produced by the client's signed upload).
- Behavior: `DiseasesService` injects `HfCropDiseaseClient` **directly** and calls `analyze({ imageUrl, cropType: '' })`. It does not go through `AiService`, so this endpoint always uses HF regardless of the report processor's `AI_PROVIDER` setting. (Rationale: `AI_PROVIDER` governs the async report pipeline; the synchronous review endpoint must always be HF — on-device is the client's fallback, not the server's.)
- Response (success): the normalized `AnalysisSuccess` shape — `disease`, `confidence` (0-100), `severity`, `recommendations`, `detectedCrop`, `advisory`, plus `engine: 'cloud'`.
- Response (retake / no reliable diagnosis): a distinct, explicit signal the client can branch on. Derive it from the advisory: `urgency === 'Retake image'` OR `primary_diagnosis.disease == null` (the "No reliable disease diagnosis" case seen in testing). Return `{ status: 'retake', guidance: <advisory.retakeImageGuidance or severity.basis>, advisory }`.
- Failure (HF down/timeout/invalid): non-2xx so the client falls back to on-device. ~30s ceiling (the HF client already budgets 60s for predict; the endpoint should cap total handler time around 30s so the mobile UX fallback isn't unbounded — make this a constant).

**2. Image cleanup — `DELETE /uploads/:publicId`**

- Add to the existing `CloudinaryController` (`@Controller('uploads')`). Authed.
- Calls the existing `CloudinaryService.destroy(publicId)` (already best-effort, swallows errors).
- Used by the client to clean up the asset when the farmer is forced to retake or abandons.

**3. `CreateReportDto` accepts a pre-computed diagnosis**

New optional fields:

- `disease?: string`
- `confidence?: number` (0-100)
- `severity?: Severity`
- `advisory?: <AnalysisAdvisory JSON>` (validated loosely as an object; stored in the existing `advisory Json?` column)
- `engine?: 'cloud' | 'on-device' | 'manual'`

`ReportsService.create` persists these when present and sets `processingStatus` accordingly:

- `engine === 'cloud'` with a diagnosis → store as `SUCCESS` with the advisory; **do not** schedule HF. Still run outbreak/realtime/notifications.
- `engine === 'on-device'` or `manual` (or no diagnosis) → store the provisional fields, set `PENDING`, and schedule the processor (which runs HF to upgrade).

**4. `ReportsProcessor` upgrade-aware**

`run()` branches on the stored engine/state:

- If the report already has a `cloud` diagnosis (came in pre-computed) → skip `AiService.analyze`, go straight to outbreak detection + realtime + high-severity fanout. (Guard so a manual `reprocess` can still force a re-run.)
- Otherwise (on-device/manual/pending) → run HF, persist the upgraded diagnosis + advisory, then outbreak/realtime/fanout. This is the existing code path; it now also overwrites a provisional on-device diagnosis.

Note: outbreak `outbreakContributed` flag already prevents double-counting on reprocess; the upgrade path must respect it.

### Mobile

**Removed:**

- The mandatory crop picker step in capture.
- The dead `analyze-image.ts` (already deleted) and any remaining references.
- The old `report-flow` result/candidate-picker screens (`result-screen.tsx`, edit-details candidate mode) and the per-capture cloud→on-device→manual chain in `use-report-flow.ts`.
- `LOW_CONFIDENCE_THRESHOLD` candidate-picker UX (replaced by the advisory's own "possible other diseases").

**Rebuilt under `features/report-flow`:**

State machine steps: `capture → analyzing → (retake | result) → submitted`.

- **capture** — camera-first, no crop step. On capture: upload to Cloudinary (signed), then transition to `analyzing`. Keep the existing camera/gallery component shell where it still fits.
- **analyzing** — polished loading: image thumbnail, animated progress, rotating status copy ("Detecting crop…", "Checking for disease…"). After a few seconds with no response, show honest cold-start copy ("The AI is waking up, this can take a moment."). Max wait ~30s before declaring failure → on-device fallback.
- **retake** — shown only when the online analyze returns `status: 'retake'`. Renders the model's guidance and a prominent Retake button. Deletes the Cloudinary asset before re-capture. No override.
- **result** — **Layout B (triage answer + expandable detail):**
  - **Answer card**: image thumbnail, detected crop + confidence + engine badge (Cloud AI / On-device), disease display name, severity pill, urgency pill, and the **single most important action** ("DO THIS FIRST") surfaced inline.
  - **Crop correction**: the farmer can correct the detected crop here if wrong.
  - **Expandable detail rows** (tap to expand): all steps to take (what_to_do_now), what this means (RAG summary), symptoms to confirm, prevention & precautions, possible other diseases, when to call an expert / safety note.
  - **Sticky Confirm & submit** button.
  - Reuse the `DiseaseAdvisory` rendering primitives already built where practical, restructured into the answer-card + accordion layout.
- **submitted** — confirmation; offers "view on map" / "new report".

**Orchestrator hook (rewritten `use-report-flow.ts`):**

1. After capture, upload to Cloudinary.
2. Read connectivity from the existing `network.store`. If offline → skip straight to on-device.
3. If online → `POST /diseases/analyze`. On `retake` → retake screen. On success → result (cloud). On failure/timeout → on-device fallback.
4. On-device path → run `offlineAiClient.analyze` on the local image → result (on-device). If on-device unavailable too → manual entry.
5. Confirm → `useCreateReport.submit` with the pre-computed diagnosis fields + `engine` + the already-uploaded `imageUrl`/`imagePublicId` (no second upload).

**`useCreateReport` changes:**

- Accept and forward `disease`, `confidence`, `severity`, `advisory`, `engine`, and a pre-uploaded `imageUrl`/`imagePublicId` (skip the upload step when the image is already on Cloudinary).
- Offline confirm path: enqueue with the provisional on-device diagnosis + `engine: 'on-device'`. The existing offline queue uploads + creates on sync; the backend then upgrades via HF.

**Mobile types:**

- Extend `Report`/advisory types as already done.
- `AnalysisResult` (report-flow) gains the full advisory and `engine` already exists; align with the backend response shape.

## Data flow summary

| Scenario | Image upload | Diagnosis source | Stored status | HF on backend? |
|---|---|---|---|---|
| Online, good photo | Cloudinary at capture | HF via `/diseases/analyze` | SUCCESS (cloud) | No (already done) |
| Online, bad photo | Cloudinary at capture, then deleted | HF says retake | (no report created) | n/a |
| Offline | deferred to sync | on-device | PENDING → SUCCESS on sync | Yes (upgrade) |
| Online but HF fails | Cloudinary at capture | on-device | PENDING → SUCCESS on sync | Yes (upgrade) |

## Error handling

- **HF cold start**: ~30s ceiling on the analyze handler; honest loading copy; fallback to on-device on timeout.
- **HF invalid response**: client falls back to on-device.
- **Cloudinary upload fails at capture**: cannot analyze online → fall back to on-device on the local image; queue the report; image uploads on sync.
- **On-device unavailable** (Expo Go / model missing): manual entry as last resort.
- **Retake asset cleanup failure**: best-effort `destroy`, non-blocking (orphaned asset acceptable).

## Testing

- **Backend unit**: `DiseasesService` (success, retake-detection, failure → non-2xx); `CreateReportDto` validation of new fields; `ReportsProcessor` branch (cloud → skip HF; on-device → upgrade).
- **Backend existing suite** must stay green (58 tests).
- **Mobile**: orchestrator hook branching (online success / retake / failure→on-device / offline→on-device / on-device-unavailable→manual). Connectivity mocked via `network.store`.
- **Live smoke**: `/diseases/analyze` against the real HF space with a real leaf image and the washed-out retake case.
- **Typecheck + lint** both apps; backend build.

## Risks & tradeoffs

1. **Client-trusted cloud diagnosis.** The backend stores the client-supplied `cloud` diagnosis without re-verifying. A spoofed client could post fake map data. Accepted for the hackathon scope; the analyze endpoint is at least authed.
2. **Backend-proxy latency.** The farmer waits for upload + HF round-trip before seeing a result (≈2.5s warm, up to ~30s cold). Mitigated by honest loading copy. This was a deliberate choice over mobile-direct to keep a server-side source of truth.
3. **Orphaned Cloudinary assets** on retake/abandon. Mitigated by `DELETE /uploads/:publicId` on retake; residual orphans are tolerable.
4. **Double image transfer** avoided by choosing Cloudinary-first (analyze by URL); Confirm reuses the existing asset.

## Affected files (indicative, not exhaustive)

**Backend**
- `src/modules/diseases/` — new module, controller, service, DTO (analyze).
- `src/modules/cloudinary/cloudinary.controller.ts` — add `DELETE /uploads/:publicId`.
- `src/modules/reports/dto/create-report.dto.ts` — new diagnosis fields.
- `src/modules/reports/reports.service.ts` — persist pre-computed diagnosis; conditional scheduling.
- `src/modules/reports/reports.processor.ts` — upgrade-aware branch.

**Mobile**
- `src/features/report-flow/` — rebuilt screens (`capture`, `analyzing`, `retake`, `result`, `submitted`), `use-report-flow.ts`, `types.ts`.
- `src/features/disease-analysis/api/` — new `analyze` API call to `/diseases/analyze`; `uploads` delete call.
- `src/features/upload-report/hooks/use-create-report.ts` — forward diagnosis fields + pre-uploaded image.
- `src/app/report.tsx` — wire the rebuilt flow.
- Reuse `src/features/offline-sync/store/network.store.ts` for connectivity.
