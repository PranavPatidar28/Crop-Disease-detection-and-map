# Design: Replace mock/seed data with real Bhopal-region crop reports

> **Date:** 2026-06-13
> **Status:** Approved — ready for implementation planning
> **Author:** brainstorming session

## Problem & goal

Both demo data layers use random `picsum.photos` images that do not match the
crop or disease they claim to depict, and the mobile fallback mock uses
Maharashtra districts (Pune, Nashik, Sangli) instead of the Bhopal region the
app is actually demoed in.

Goal: replace both layers with reports that use the **real photos** in
`/crop-images`, attributed to believable farmers in towns **around Bhopal**,
where the crop name, disease name, treatment advice, and image are all mutually
consistent.

### Scope (in)

- `apps/backend/src/scripts/seed-demo.ts` — seeds the Postgres DB, which is the
  live source the mobile app reads from.
- `apps/mobile/src/features/dashboard/mocks/dashboard.mock.ts` — the offline
  fallback shown when the backend is unreachable.

### Scope (out)

- The `MockAiClient` / `disease-catalog.ts` used by the AI inference path.
- Any change to the live upload / report-creation flow.
- Real agronomic certification of recommendations (best-effort accuracy only).

## Source data

`/crop-images/<crop>/<disease-or-healthy>/<image>.jpg`

- 15 crops: blackgram, brinjal, cabbage, cauliflower, chilli, cotton,
  groundnut, maize, rice, sorghum, soyabean, sugarcane, sunflower, tomato,
  wheat.
- ~72 disease/`healthy` subfolders total, each containing ~2 images (~144
  images overall).

## Architecture

Four cooperating pieces, with a one-time manual upload step in the middle:

```
/crop-images (local files)
      │  (1) upload script — run once, manually, with Cloudinary creds
      ▼
Cloudinary (crop-disease/demo-seed/<crop>/<disease>/...)
      │  writes
      ▼
crop-image-manifest.json (committed)  ──► crop-image-urls.json (mobile subset, committed)
      │                                          │
      │ consumed by                              │ consumed by
      ▼                                          ▼
seed-demo.ts (DB reports)                 dashboard.mock.ts (offline fallback)
      ▲
      │ disease names + recommendations
crop-disease-catalog.ts (committed)
```

### 1. Image bridge — upload script + manifest

New script: `apps/backend/src/scripts/upload-crop-images.ts`
(run via a new `package.json` script, e.g. `pnpm --filter backend upload:crop-images`).

- Walks `/crop-images` recursively.
- Uploads each image to Cloudinary under
  `crop-disease/demo-seed/<crop>/<disease>` with a **deterministic `public_id`**
  (derived from crop + disease + a stable index) so re-runs overwrite rather
  than duplicate.
- Reads the existing `CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET` env vars
  (same ones `CloudinaryService` uses). **Fails fast** with a clear message if
  any are missing or empty.
- Per-file `try/catch`: a single failed upload logs a warning and continues; the
  run ends with a summary (`N uploaded, M failed`).
- Writes a committed manifest:

  ```
  apps/backend/src/scripts/data/crop-image-manifest.json
  {
    "tomato": {
      "late_blight": [
        { "url": "https://res.cloudinary.com/.../late_blight-0.jpg", "publicId": "crop-disease/demo-seed/tomato/late_blight-0" },
        ...
      ],
      ...
    },
    ...
  }
  ```

- Also writes a curated mobile subset (the handful of crop/disease pairs used by
  the mobile mock) to
  `apps/mobile/src/features/dashboard/mocks/crop-image-urls.json` so the two
  apps stay in sync from a single upload.

**This step is run manually by the user.** The agent cannot run it (no creds).
Everything downstream consumes the committed JSON files.

### 2. Content catalog — `crop-disease-catalog.ts`

New file: `apps/backend/src/scripts/data/crop-disease-catalog.ts`.

Maps each `<crop>/<folder>` key to:

- `displayName` — human form (`late_blight` → "Late Blight",
  `sudden_death_syndrone` → "Sudden Death Syndrome",
  `yellow_mosaic` → "Yellow Mosaic Virus").
- `recommendations` — 2-4 tailored agronomic actions for **every** disease
  folder across all 15 crops.
- `defaultSeverity` — a sensible severity bias (`HIGH` / `MEDIUM` / `LOW`).

`healthy` folders reuse the existing "No action required…" copy and `LOW`
severity.

### 3. Users & geography — `seed-demo.ts`

7 demo farmers, each in a real town around Bhopal with accurate coordinates.
The two existing demo logins are preserved so auth still works.

| Name           | Phone        | Town        | Approx coords     |
| -------------- | ------------ | ----------- | ----------------- |
| Mahesh Verma   | 9999999999   | Bhopal      | 23.2599, 77.4126  |
| Sunita Rajput  | 8888888888   | Sehore      | 23.2020, 77.0857  |
| Ramesh Patidar | 7777777777   | Vidisha     | 23.5251, 77.8061  |
| Lakhan Yadav   | 7766554433   | Raisen      | 23.3306, 77.7859  |
| Geeta Lodhi    | 7755443322   | Hoshangabad | 22.7540, 77.7300  |
| Devilal Meena  | 7744332211   | Rajgarh     | 24.0090, 76.7300  |
| Kailash Dangi  | 7733221100   | Berasia     | 23.6300, 77.4300  |

(Phone numbers above are placeholders; final values fixed during
implementation. All users are idempotent via `upsert` on `phone`.)

### 4. Report distribution — `seed-demo.ts`

~40-45 reports total. Each report pulls `imageUrl` + `imagePublicId` from the
manifest and `disease` + `recommendations` from the catalog.

- **3 dense clusters** (trigger outbreak zones, preserving current demo intent):
  - Soybean Yellow Mosaic in Sehore — **HIGH** (~8 reports).
  - Wheat Stripe Rust in Vidisha — **MEDIUM** (~6 reports).
  - Tomato Late Blight near Bhopal — **LOW/MEDIUM** (~5 reports).
- **Scattered singletons/pairs** across the remaining crops (maize, cotton,
  chilli, sugarcane, rice, sorghum, brinjal, cauliflower, cabbage, groundnut,
  sunflower, blackgram) spread across the region — variety without forming
  outbreaks.
- **A few healthy reports** to show the green branch.
- Reports attributed across all 7 users.
- Outbreak zones rebuilt from cluster counts (as today).
- Idempotency preserved: each report keyed by `(userId, clientId)` with stable
  `clientId = seed:report:<i>`.

If the manifest is missing, the seed **warns and falls back** to placeholder
URLs rather than hard-failing (matches existing resilience philosophy).

### 5. Mobile mock rewrite — `dashboard.mock.ts`

- ~6-8 representative reports using real Cloudinary URLs from
  `crop-image-urls.json`, Bhopal-region districts, and outbreaks/alerts/trends
  consistent with the seed clusters.
- Replace the Maharashtra districts (Pune/Nashik/Sangli) with Bhopal-region
  districts (Bhopal/Sehore/Vidisha/Raisen).
- Stays resilient: if `crop-image-urls.json` is absent or an entry is missing,
  fall back to the existing `picsum.photos` placeholder so the dashboard never
  breaks.

## Error handling

- **Upload script:** fail fast on missing/empty creds; per-file `try/catch`;
  end-of-run summary; non-zero exit code only on a fatal (creds) error.
- **Seed:** missing manifest → warn + placeholder URLs, never hard-fail.
- **Mobile mock:** missing JSON / entry → `picsum.photos` placeholder.
- **Catalog completeness:** a unit test asserts every `/crop-images` folder has
  a catalog entry, so no disease silently degrades to a generic name.

## Testing

- New unit test: every `/crop-images` crop/disease folder has a
  `crop-disease-catalog.ts` entry with a non-empty `displayName` and ≥1
  recommendation.
- `pnpm --filter backend build` succeeds.
- Existing seed-related and `severity` tests still pass.
- Manual: after running the upload script, `pnpm --filter backend seed:demo`
  produces reports whose images visibly match their crop/disease.

## Decisions & tradeoffs

- **Dropped crops:** Gram and Mustard from the current seed are removed (no
  images); replaced by the 15 imaged crops.
- **Manual upload:** the Cloudinary upload is a manual step the user runs with
  their own creds; all downstream consumers read the committed manifest, so the
  build/seed remain reproducible without re-uploading.
- **Tailored recommendations for all diseases:** larger content effort and some
  agronomic-accuracy risk, accepted in exchange for realism.
