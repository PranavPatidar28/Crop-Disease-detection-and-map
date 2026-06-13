# Realistic Bhopal-Region Crop Mock Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace random `picsum.photos` mock/seed data with reports that use the real `/crop-images` photos, attributed to farmers in towns around Bhopal, where crop, disease name, treatment advice, and image are all consistent.

**Architecture:** A one-time upload script pushes `/crop-images` to Cloudinary and writes a committed manifest (`crop-image-manifest.json`) plus a mobile subset (`crop-image-urls.json`). A disease catalog (`crop-disease-catalog.ts`) maps every crop/disease folder to a display name + tailored recommendations + severity. The backend seed (`seed-demo.ts`) and mobile mock (`dashboard.mock.ts`) consume these committed files, falling back to placeholders if the manifest is absent.

**Tech Stack:** NestJS, Prisma 5 + Postgres, Cloudinary SDK 2.x, ts-node, Jest (ts-jest), TypeScript 5.6.

---

## File Structure

- **Create:** `apps/backend/src/scripts/data/crop-disease-catalog.ts` — crop/disease → `{ displayName, recommendations, defaultSeverity }`.
- **Create:** `apps/backend/src/scripts/data/crop-disease-catalog.spec.ts` — asserts every `/crop-images` folder has a catalog entry.
- **Create:** `apps/backend/src/scripts/data/crop-image-manifest.json` — committed placeholder `{}`, overwritten by the upload script.
- **Create:** `apps/backend/src/scripts/upload-crop-images.ts` — one-time Cloudinary uploader + manifest writer.
- **Create:** `apps/mobile/src/features/dashboard/mocks/crop-image-urls.json` — committed placeholder consumed by the mobile mock.
- **Modify:** `apps/backend/package.json` — add `upload:crop-images` script.
- **Modify:** `apps/backend/src/scripts/seed-demo.ts` — consume catalog + manifest, 7 users, new distribution.
- **Modify:** `apps/mobile/src/features/dashboard/mocks/dashboard.mock.ts` — real URLs, Bhopal districts.

---

## Task 1: Disease catalog + completeness test

**Files:**
- Create: `apps/backend/src/scripts/data/crop-disease-catalog.spec.ts`
- Create: `apps/backend/src/scripts/data/crop-disease-catalog.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/backend/src/scripts/data/crop-disease-catalog.spec.ts`:

```ts
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

import { CROP_DISEASE_CATALOG, getCatalogEntry } from './crop-disease-catalog';

// repo-root/crop-images, 5 levels up from this file's directory
const CROP_IMAGES_DIR = join(__dirname, '../../../../../crop-images');

function listFolderPairs(): Array<{ crop: string; disease: string }> {
  const pairs: Array<{ crop: string; disease: string }> = [];
  for (const crop of readdirSync(CROP_IMAGES_DIR)) {
    const cropPath = join(CROP_IMAGES_DIR, crop);
    if (!statSync(cropPath).isDirectory()) continue;
    for (const disease of readdirSync(cropPath)) {
      if (!statSync(join(cropPath, disease)).isDirectory()) continue;
      pairs.push({ crop, disease });
    }
  }
  return pairs;
}

describe('crop-disease catalog', () => {
  const pairs = listFolderPairs();

  it('discovers crop/disease folders on disk', () => {
    expect(pairs.length).toBeGreaterThan(60);
  });

  it.each(pairs)('has an entry for $crop/$disease', ({ crop, disease }) => {
    const entry = getCatalogEntry(crop, disease);
    expect(entry).toBeDefined();
    expect(entry!.displayName.length).toBeGreaterThan(0);
    expect(entry!.recommendations.length).toBeGreaterThan(0);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(entry!.defaultSeverity);
  });

  it('exposes a catalog keyed by crop', () => {
    expect(Object.keys(CROP_DISEASE_CATALOG).length).toBeGreaterThanOrEqual(15);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec jest src/scripts/data/crop-disease-catalog.spec.ts`
Expected: FAIL — `Cannot find module './crop-disease-catalog'`.

- [ ] **Step 3: Write the catalog**

Create `apps/backend/src/scripts/data/crop-disease-catalog.ts`:

```ts
/**
 * Maps every `/crop-images/<crop>/<disease>` folder to a farmer-facing display
 * name, tailored agronomic recommendations, and a default severity bias.
 *
 * Used by the demo seed to build reports whose disease name + advice are
 * consistent with the real image in that folder. Keep keys in sync with the
 * folder names on disk — `crop-disease-catalog.spec.ts` enforces completeness.
 */

export type CatalogSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CropDiseaseEntry {
  /** Farmer-facing disease name, e.g. "Late Blight". */
  displayName: string;
  /** 2-4 tailored agronomic actions. */
  recommendations: string[];
  defaultSeverity: CatalogSeverity;
}

const HEALTHY: CropDiseaseEntry = {
  displayName: 'Healthy Crop',
  recommendations: [
    'No action required — your crop appears healthy.',
    'Continue regular scouting and monitor for any new symptoms.',
  ],
  defaultSeverity: 'LOW',
};

export const CROP_DISEASE_CATALOG: Record<string, Record<string, CropDiseaseEntry>> = {
  blackgram: {
    anthracnose: {
      displayName: 'Anthracnose',
      recommendations: [
        'Spray carbendazim or mancozeb at first sign of sunken dark lesions.',
        'Use disease-free, treated seed and avoid overhead irrigation.',
        'Remove and destroy infected plant debris after harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    healthy: HEALTHY,
    leaf_crinckle: {
      displayName: 'Leaf Crinkle Virus',
      recommendations: [
        'Rogue out crinkled, stunted plants early to limit spread.',
        'Control aphid and whitefly vectors with recommended insecticide.',
        'Sow certified virus-free seed next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Dust with wettable sulphur or spray dinocap on first white patches.',
        'Improve air flow by avoiding dense, over-fertilised stands.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    yellow_mosaic: {
      displayName: 'Yellow Mosaic Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Rogue out and destroy symptomatic plants to cut the inoculum source.',
        'Prefer YMV-tolerant varieties and avoid late sowing next season.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  brinjal: {
    cercospora_leaf_spot: {
      displayName: 'Cercospora Leaf Spot',
      recommendations: [
        'Spray mancozeb or copper oxychloride at first angular leaf spots.',
        'Remove lower infected leaves and improve plant spacing.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  cabbage: {
    alternaria_leaf_spot: {
      displayName: 'Alternaria Leaf Spot',
      recommendations: [
        'Spray mancozeb at the first concentric-ring leaf spots.',
        'Remove and burn heavily infected outer leaves.',
        'Rotate with a non-crucifer crop next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    bacterial_spot_rot: {
      displayName: 'Bacterial Soft Rot',
      recommendations: [
        'Remove and destroy mushy, foul-smelling heads immediately.',
        'Improve field drainage and avoid injury during handling.',
        'Avoid overhead irrigation in warm, humid weather.',
      ],
      defaultSeverity: 'HIGH',
    },
    black_rot: {
      displayName: 'Black Rot',
      recommendations: [
        'Use hot-water-treated, certified seed.',
        'Spray copper-based bactericide on early V-shaped yellow lesions.',
        'Practice 2-3 year rotation away from crucifers.',
      ],
      defaultSeverity: 'HIGH',
    },
    cabbage_aphid_colony: {
      displayName: 'Cabbage Aphid Infestation',
      recommendations: [
        'Spray dimethoate or a neem-based insecticide on aphid colonies.',
        'Encourage ladybird beetles and other natural predators.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    club_root: {
      displayName: 'Club Root',
      recommendations: [
        'Lime the soil to raise pH above 7.2 to suppress the pathogen.',
        'Avoid moving infested soil; practice long crop rotation.',
        'Remove and destroy galled roots after harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Spray metalaxyl + mancozeb on first yellow upper-leaf patches.',
        'Avoid evening irrigation that leaves foliage wet overnight.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    ring_spot: {
      displayName: 'Ring Spot',
      recommendations: [
        'Spray mancozeb at first dark circular spots with concentric rings.',
        'Remove crop debris and rotate away from crucifers.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  cauliflower: {
    bacterial_spot_rot: {
      displayName: 'Bacterial Soft Rot',
      recommendations: [
        'Remove and destroy soft, rotting curds promptly.',
        'Improve drainage and avoid bruising during harvest.',
      ],
      defaultSeverity: 'HIGH',
    },
    black_rot: {
      displayName: 'Black Rot',
      recommendations: [
        'Sow hot-water-treated seed and spray copper bactericide early.',
        'Rotate away from crucifers for 2-3 years.',
      ],
      defaultSeverity: 'HIGH',
    },
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Spray metalaxyl + mancozeb at first signs.',
        'Avoid dense planting and evening irrigation.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  chilli: {
    bacterial_spot: {
      displayName: 'Bacterial Leaf Spot',
      recommendations: [
        'Spray streptocycline + copper oxychloride on early water-soaked spots.',
        'Use disease-free seed and avoid working in wet fields.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  cotton: {
    bacterial_blight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Spray copper oxychloride + streptocycline on angular leaf spots.',
        'Use acid-delinted, treated seed and destroy infected stubble.',
      ],
      defaultSeverity: 'HIGH',
    },
    curl_virus: {
      displayName: 'Cotton Leaf Curl Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Rogue out curled, stunted plants early.',
        'Grow CLCuV-tolerant hybrids next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    fussarium_wilt: {
      displayName: 'Fusarium Wilt',
      recommendations: [
        'Drench root zone with carbendazim around affected plants.',
        'Improve drainage and rotate with a cereal crop.',
        'Sow wilt-resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    healthy: HEALTHY,
  },
  groundnut: {
    dead_leaf: {
      displayName: 'Late Leaf Spot',
      recommendations: [
        'Spray chlorothalonil or mancozeb at first dark leaf spots.',
        'Remove fallen infected leaves to reduce inoculum.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    diseased_leaf: {
      displayName: 'Leaf Spot (Tikka Disease)',
      recommendations: [
        'Spray carbendazim + mancozeb at 15-day intervals on spotting.',
        'Follow crop rotation and remove volunteer plants.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  maize: {
    blight: {
      displayName: 'Northern Leaf Blight',
      recommendations: [
        'Spray mancozeb or azoxystrobin on early cigar-shaped lesions.',
        'Grow resistant hybrids and rotate with non-cereal crops.',
      ],
      defaultSeverity: 'HIGH',
    },
    common_rust: {
      displayName: 'Common Rust',
      recommendations: [
        'Spray a triazole fungicide if pustules appear before tasseling.',
        'Prefer rust-resistant hybrids next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    gray_leaf_spot: {
      displayName: 'Gray Leaf Spot',
      recommendations: [
        'Spray azoxystrobin on early rectangular gray lesions.',
        'Avoid continuous maize; rotate and bury residue.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
  },
  rice: {
    bacterialblight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Drain the field and spray copper oxychloride + streptocycline.',
        'Avoid excess nitrogen; use resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    blast: {
      displayName: 'Rice Blast',
      recommendations: [
        'Spray tricyclazole at first spindle-shaped leaf lesions.',
        'Avoid heavy nitrogen and maintain balanced fertilisation.',
        'Grow blast-resistant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    brownspot: {
      displayName: 'Brown Spot',
      recommendations: [
        'Spray mancozeb and correct potassium/zinc deficiency.',
        'Use treated seed and avoid water stress.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    tungro: {
      displayName: 'Tungro Virus',
      recommendations: [
        'Control the green leafhopper vector with recommended insecticide.',
        'Rogue out infected orange-yellow plants early.',
        'Grow tungro-tolerant varieties and synchronise planting.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  sorghum: {
    anthracnose_and_red_rot: {
      displayName: 'Anthracnose & Red Rot',
      recommendations: [
        'Spray mancozeb and use treated, resistant seed.',
        'Destroy infected stalks and rotate crops.',
      ],
      defaultSeverity: 'HIGH',
    },
    cereal_grain_molds: {
      displayName: 'Grain Mold',
      recommendations: [
        'Harvest promptly at maturity and dry grain quickly.',
        'Prefer mold-tolerant varieties in high-rainfall windows.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    covered_kernel_smut: {
      displayName: 'Covered Kernel Smut',
      recommendations: [
        'Treat seed with carboxin or sulphur before sowing.',
        'Use clean, certified seed each season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    head_smut: {
      displayName: 'Head Smut',
      recommendations: [
        'Treat seed with a systemic fungicide and rogue out smutted heads.',
        'Practice crop rotation to reduce soil inoculum.',
      ],
      defaultSeverity: 'HIGH',
    },
    loose_smut: {
      displayName: 'Loose Smut',
      recommendations: [
        'Treat seed with carboxin before sowing.',
        'Remove and destroy smutted heads before they shed spores.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    rust: {
      displayName: 'Rust',
      recommendations: [
        'Spray a triazole fungicide if rust appears before grain fill.',
        'Grow rust-resistant varieties next season.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  soyabean: {
    bacterial_blight: {
      displayName: 'Bacterial Blight',
      recommendations: [
        'Spray copper oxychloride on early angular water-soaked spots.',
        'Avoid field operations when foliage is wet.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    brown_spot: {
      displayName: 'Brown Spot',
      recommendations: [
        'Spray mancozeb if lower-leaf spotting spreads upward.',
        'Use treated seed and rotate with a non-host crop.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    ferrugen: {
      displayName: 'Soybean Rust',
      recommendations: [
        'Spray a triazole fungicide at first rust pustules on lower leaves.',
        'Scout regularly during humid weather; rust spreads fast.',
      ],
      defaultSeverity: 'HIGH',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Dust wettable sulphur on first white powdery patches.',
        'Avoid excessive nitrogen and dense canopies.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    southern_blight: {
      displayName: 'Southern Blight',
      recommendations: [
        'Remove collapsed plants with white fungal mats at the stem base.',
        'Deep-plough residue and improve drainage.',
      ],
      defaultSeverity: 'HIGH',
    },
    sudden_death_syndrone: {
      displayName: 'Sudden Death Syndrome',
      recommendations: [
        'Improve drainage and avoid compaction in low-lying areas.',
        'Use SDS-tolerant varieties and a seed-treatment fungicide.',
      ],
      defaultSeverity: 'HIGH',
    },
    yellow_mosaic: {
      displayName: 'Yellow Mosaic Virus',
      recommendations: [
        'Spray imidacloprid to control whitefly — the YMV vector.',
        'Rogue out and destroy symptomatic plants to cut the inoculum source.',
        'Prefer YMV-tolerant varieties (JS 20-34) and avoid late sowing.',
        'Scout field borders daily — infection usually creeps in from the edges.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  sugarcane: {
    healthy: HEALTHY,
    mosaic: {
      displayName: 'Mosaic Virus',
      recommendations: [
        'Plant virus-free, certified setts from a healthy seed crop.',
        'Rogue out mosaic-affected clumps and control aphid vectors.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    redrot: {
      displayName: 'Red Rot',
      recommendations: [
        'Uproot and burn affected clumps showing reddened internal pith.',
        'Plant resistant varieties and use healthy setts.',
        'Avoid ratooning an infected crop.',
      ],
      defaultSeverity: 'HIGH',
    },
    rust: {
      displayName: 'Rust',
      recommendations: [
        'Spray mancozeb if orange-brown pustules spread on leaves.',
        'Improve spacing and grow resistant varieties.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    yellow: {
      displayName: 'Yellow Leaf Disease',
      recommendations: [
        'Use tissue-cultured, disease-free planting material.',
        'Control aphid vectors and rogue out affected clumps.',
      ],
      defaultSeverity: 'MEDIUM',
    },
  },
  sunflower: {
    downy_mildew: {
      displayName: 'Downy Mildew',
      recommendations: [
        'Treat seed with metalaxyl before sowing.',
        'Rogue out stunted plants with white growth on leaf undersides.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    gray_mold: {
      displayName: 'Gray Mold',
      recommendations: [
        'Spray a botryticide if gray fuzzy growth appears on heads.',
        'Improve air flow and avoid harvesting in damp weather.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    leaf_scars: {
      displayName: 'Leaf Scars',
      recommendations: [
        'Monitor — minor scarring rarely needs chemical control.',
        'Maintain balanced nutrition and avoid mechanical injury.',
      ],
      defaultSeverity: 'LOW',
    },
  },
  tomato: {
    bacterial_spot: {
      displayName: 'Bacterial Spot',
      recommendations: [
        'Spray copper-based bactericide on early water-soaked spots.',
        'Use disease-free seed and avoid overhead irrigation.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    early_blight: {
      displayName: 'Early Blight',
      recommendations: [
        'Spray mancozeb or chlorothalonil at first target-like leaf spots.',
        'Mulch and stake plants; remove lower infected leaves.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    healthy: HEALTHY,
    late_blight: {
      displayName: 'Late Blight',
      recommendations: [
        'Spray metalaxyl + mancozeb immediately on dark water-soaked lesions.',
        'Remove and destroy infected plants to slow the spread.',
        'Avoid overhead irrigation in cool, humid weather.',
      ],
      defaultSeverity: 'HIGH',
    },
    leaf_mold: {
      displayName: 'Leaf Mold',
      recommendations: [
        'Improve ventilation and spray chlorothalonil on yellow upper-leaf patches.',
        'Avoid leaf wetness, especially in polyhouses.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    powdery_mildew: {
      displayName: 'Powdery Mildew',
      recommendations: [
        'Spray wettable sulphur on first white powdery patches.',
        'Avoid water stress and dense canopies.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    septoria_leaf_spot: {
      displayName: 'Septoria Leaf Spot',
      recommendations: [
        'Spray mancozeb at first small dark-bordered spots.',
        'Remove lower infected leaves and mulch the soil surface.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    spider_mites_two_spotted_spider_mite: {
      displayName: 'Two-Spotted Spider Mite',
      recommendations: [
        'Spray a miticide or neem oil on stippled, webbed leaves.',
        'Raise humidity and remove heavily infested leaves.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    target_spot: {
      displayName: 'Target Spot',
      recommendations: [
        'Spray azoxystrobin or chlorothalonil on concentric-ring lesions.',
        'Improve spacing and remove infected debris.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    tomato_mosaic_virus: {
      displayName: 'Tomato Mosaic Virus',
      recommendations: [
        'Rogue out mottled, distorted plants and disinfect tools.',
        'Wash hands before handling; avoid tobacco use near plants.',
        'Sow certified virus-free seed next season.',
      ],
      defaultSeverity: 'HIGH',
    },
    tomato_yellow_leaf_curl_virus: {
      displayName: 'Tomato Yellow Leaf Curl Virus',
      recommendations: [
        'Spray imidacloprid to control the whitefly vector.',
        'Use yellow sticky traps and rogue out curled, stunted plants.',
        'Grow TYLCV-tolerant varieties next season.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
  wheat: {
    healthy: HEALTHY,
    septoria: {
      displayName: 'Septoria Leaf Blotch',
      recommendations: [
        'Spray a triazole fungicide on early blotches with dark specks.',
        'Use clean seed and bury infected residue.',
      ],
      defaultSeverity: 'MEDIUM',
    },
    stripe_rust: {
      displayName: 'Stripe Rust (Yellow Rust)',
      recommendations: [
        'Apply propiconazole if rust pustules cover more than 5% of leaves.',
        'Scout neighbouring fields and inform the local krishi vigyan kendra.',
        'Choose a yellow-rust-resistant variety (HD 3086 / GW 322) next sowing.',
      ],
      defaultSeverity: 'HIGH',
    },
  },
};

/** Returns the catalog entry for a crop/disease folder pair, or undefined. */
export function getCatalogEntry(
  crop: string,
  disease: string,
): CropDiseaseEntry | undefined {
  return CROP_DISEASE_CATALOG[crop]?.[disease];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec jest src/scripts/data/crop-disease-catalog.spec.ts`
Expected: PASS — all folder pairs resolve to an entry.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/scripts/data/crop-disease-catalog.ts apps/backend/src/scripts/data/crop-disease-catalog.spec.ts
git commit -m "feat(seed): add crop-disease catalog with completeness test"
```

---

## Task 2: Committed placeholder manifest + mobile URL file

These committed files let the seed and the mobile mock build and run before the
(manual) Cloudinary upload has happened. The upload script overwrites them.

**Files:**
- Create: `apps/backend/src/scripts/data/crop-image-manifest.json`
- Create: `apps/mobile/src/features/dashboard/mocks/crop-image-urls.json`

- [ ] **Step 1: Create the placeholder backend manifest**

Create `apps/backend/src/scripts/data/crop-image-manifest.json`:

```json
{}
```

- [ ] **Step 2: Create the placeholder mobile URL file**

Create `apps/mobile/src/features/dashboard/mocks/crop-image-urls.json`. Keys are
`"<crop>/<disease>"`; values are image URLs. Placeholders use `picsum.photos`
until the upload script overwrites them:

```json
{
  "soyabean/yellow_mosaic": "https://picsum.photos/seed/soyabean-yellow-mosaic/640/480",
  "wheat/stripe_rust": "https://picsum.photos/seed/wheat-stripe-rust/640/480",
  "tomato/late_blight": "https://picsum.photos/seed/tomato-late-blight/640/480",
  "maize/common_rust": "https://picsum.photos/seed/maize-common-rust/640/480",
  "cotton/curl_virus": "https://picsum.photos/seed/cotton-curl-virus/640/480",
  "chilli/bacterial_spot": "https://picsum.photos/seed/chilli-bacterial-spot/640/480",
  "soyabean/healthy": "https://picsum.photos/seed/soyabean-healthy/640/480",
  "wheat/healthy": "https://picsum.photos/seed/wheat-healthy/640/480"
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/data/crop-image-manifest.json apps/mobile/src/features/dashboard/mocks/crop-image-urls.json
git commit -m "chore(seed): add placeholder image manifest + mobile url map"
```

---

## Task 3: Cloudinary upload script

**Files:**
- Create: `apps/backend/src/scripts/upload-crop-images.ts`
- Modify: `apps/backend/package.json:22`

- [ ] **Step 1: Add the package.json script**

In `apps/backend/package.json`, add a script after the `seed:demo` line (line 22). The `seed:demo` line currently ends without a trailing comma — add one:

```json
    "seed:demo": "ts-node -r tsconfig-paths/register src/scripts/seed-demo.ts",
    "upload:crop-images": "ts-node -r tsconfig-paths/register src/scripts/upload-crop-images.ts"
```

- [ ] **Step 2: Write the upload script**

Create `apps/backend/src/scripts/upload-crop-images.ts`:

```ts
/**
 * One-time uploader: pushes every image under /crop-images to Cloudinary and
 * writes two committed files the demo seed + mobile mock consume:
 *
 *   - src/scripts/data/crop-image-manifest.json   (full crop→disease→[urls])
 *   - apps/mobile/.../mocks/crop-image-urls.json  (curated subset for the mock)
 *
 * Run manually with Cloudinary creds in env:
 *   pnpm --filter backend upload:crop-images
 *
 * Deterministic public_ids mean re-runs overwrite rather than duplicate.
 */

import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

import { v2 as cloudinary } from 'cloudinary';

import { logger } from '../common/utils/logger';

const CROP_IMAGES_DIR = join(__dirname, '../../../../crop-images');
const MANIFEST_PATH = join(__dirname, 'data', 'crop-image-manifest.json');
const MOBILE_URLS_PATH = join(
  __dirname,
  '../../../mobile/src/features/dashboard/mocks/crop-image-urls.json',
);
const FOLDER = 'crop-disease/demo-seed';

// Crop/disease pairs surfaced by the mobile mock. Keys are "<crop>/<disease>".
const MOBILE_KEYS = [
  'soyabean/yellow_mosaic',
  'wheat/stripe_rust',
  'tomato/late_blight',
  'maize/common_rust',
  'cotton/curl_virus',
  'chilli/bacterial_spot',
  'soyabean/healthy',
  'wheat/healthy',
];

interface ManifestImage {
  url: string;
  publicId: string;
}
type Manifest = Record<string, Record<string, ManifestImage[]>>;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    logger.error(`Missing required env var: ${name}. Set Cloudinary creds and retry.`);
    process.exit(1);
  }
  return value;
}

function isImage(file: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(file);
}

async function run(): Promise<void> {
  cloudinary.config({
    cloud_name: requireEnv('CLOUDINARY_CLOUD_NAME'),
    api_key: requireEnv('CLOUDINARY_API_KEY'),
    api_secret: requireEnv('CLOUDINARY_API_SECRET'),
    secure: true,
  });

  if (!existsSync(CROP_IMAGES_DIR)) {
    logger.error(`crop-images directory not found at ${CROP_IMAGES_DIR}`);
    process.exit(1);
  }

  const manifest: Manifest = {};
  let uploaded = 0;
  let failed = 0;

  for (const crop of readdirSync(CROP_IMAGES_DIR)) {
    const cropPath = join(CROP_IMAGES_DIR, crop);
    if (!statSync(cropPath).isDirectory()) continue;
    manifest[crop] = {};

    for (const disease of readdirSync(cropPath)) {
      const diseasePath = join(cropPath, disease);
      if (!statSync(diseasePath).isDirectory()) continue;

      const images: ManifestImage[] = [];
      const files = readdirSync(diseasePath).filter(isImage);

      for (let i = 0; i < files.length; i += 1) {
        const filePath = join(diseasePath, files[i]!);
        const publicId = `${FOLDER}/${crop}/${disease}-${i}`;
        try {
          const res = await cloudinary.uploader.upload(filePath, {
            public_id: publicId,
            overwrite: true,
            resource_type: 'image',
          });
          images.push({ url: res.secure_url, publicId: res.public_id });
          uploaded += 1;
        } catch (err) {
          failed += 1;
          logger.warn(`Upload failed for ${filePath}: ${(err as Error).message}`);
        }
      }

      manifest[crop]![disease] = images;
    }
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  logger.info(`Wrote manifest → ${MANIFEST_PATH}`);

  // Curated mobile subset: first image of each MOBILE_KEYS pair.
  const mobileUrls: Record<string, string> = {};
  for (const key of MOBILE_KEYS) {
    const [crop, disease] = key.split('/');
    const first = manifest[crop!]?.[disease!]?.[0];
    if (first) mobileUrls[key] = first.url;
    else logger.warn(`No uploaded image for mobile key "${key}" — left out of url map`);
  }
  if (!existsSync(dirname(MOBILE_URLS_PATH))) {
    logger.warn(`Mobile mocks dir missing; skipping ${MOBILE_URLS_PATH}`);
  } else {
    writeFileSync(MOBILE_URLS_PATH, `${JSON.stringify(mobileUrls, null, 2)}\n`, 'utf8');
    logger.info(`Wrote mobile url map → ${MOBILE_URLS_PATH}`);
  }

  logger.info(`✅ Upload complete: ${uploaded} uploaded, ${failed} failed.`);
}

run().catch((err) => {
  logger.error('Upload script failed', err);
  process.exitCode = 1;
});
```

- [ ] **Step 3: Typecheck the script**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS — no type errors. (The script is not executed here; it needs creds.)

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/upload-crop-images.ts apps/backend/package.json
git commit -m "feat(seed): add Cloudinary crop-image upload script"
```

---

## Task 4: Rewrite the backend demo seed

Replace the body of `seed-demo.ts` so reports are built from the catalog +
manifest, attributed to 7 Bhopal-region users, with 3 dense clusters and
scattered variety.

**Files:**
- Modify: `apps/backend/src/scripts/seed-demo.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/backend/src/scripts/seed-demo.ts` with:

```ts
/**
 * Demo seed — produces a visually impactful initial state for hackathon demos,
 * centered on Bhopal, Madhya Pradesh.
 *
 * Images come from the committed Cloudinary manifest written by
 * `upload-crop-images.ts`. Disease names + recommendations come from
 * `crop-disease-catalog.ts`. If the manifest is missing (upload not run), the
 * seed falls back to deterministic picsum URLs so it never hard-fails.
 *
 * Behaviour:
 *   - Idempotent: reports keyed by (userId, clientId); plots deduped by name.
 *   - Creates 7 demo users across Bhopal-region towns.
 *   - 3 dense clusters trigger outbreak zones (HIGH Sehore soybean, MEDIUM
 *     Vidisha wheat, LOW/MEDIUM Bhopal tomato); other crops are scattered.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { PrismaClient, ProcessingStatus, Severity } from '@prisma/client';

import { logger } from '../common/utils/logger';
import {
  CatalogSeverity,
  getCatalogEntry,
} from './data/crop-disease-catalog';

const prisma = new PrismaClient();

// --- Image manifest (written by upload-crop-images.ts) ---
interface ManifestImage {
  url: string;
  publicId: string;
}
type Manifest = Record<string, Record<string, ManifestImage[]>>;

const MANIFEST_PATH = join(__dirname, 'data', 'crop-image-manifest.json');

function loadManifest(): Manifest {
  try {
    if (!existsSync(MANIFEST_PATH)) return {};
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  } catch (err) {
    logger.warn(`Could not read manifest: ${(err as Error).message}`);
    return {};
  }
}

const manifest = loadManifest();

/** Returns a real Cloudinary image for a crop/disease, or a picsum fallback. */
function imageFor(
  crop: string,
  disease: string,
  index: number,
): { imageUrl: string; imagePublicId: string } {
  const images = manifest[crop]?.[disease] ?? [];
  if (images.length > 0) {
    const img = images[index % images.length]!;
    return { imageUrl: img.url, imagePublicId: img.publicId };
  }
  const seed = `${crop}-${disease}-${index}`;
  return {
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`,
    imagePublicId: `seed-fallback-${seed}`,
  };
}

const SEVERITY_MAP: Record<CatalogSeverity, Severity> = {
  LOW: Severity.LOW,
  MEDIUM: Severity.MEDIUM,
  HIGH: Severity.HIGH,
};

// --- Bhopal region anchors (lat/lng) ---
const BHOPAL = { lat: 23.2599, lng: 77.4126 };
const SEHORE = { lat: 23.202, lng: 77.0857 };
const VIDISHA = { lat: 23.5251, lng: 77.8061 };
const RAISEN = { lat: 23.3306, lng: 77.7859 };
const HOSHANGABAD = { lat: 22.754, lng: 77.73 };
const RAJGARH = { lat: 24.009, lng: 76.73 };
const BERASIA = { lat: 23.63, lng: 77.43 };

function jitter(center: number, radiusKm: number): number {
  const offDeg = (Math.random() - 0.5) * 2 * (radiusKm / 110);
  return center + offDeg;
}

// Display name → folder key, so we can look up catalog + manifest by folder.
interface SeedReport {
  cropType: string; // display crop, e.g. "Soybean"
  cropFolder: string; // /crop-images folder, e.g. "soyabean"
  diseaseFolder: string; // /crop-images disease folder, e.g. "yellow_mosaic"
  severity: Severity;
  confidence: number;
  latitude: number;
  longitude: number;
  ageHours: number;
}

function entryOrThrow(cropFolder: string, diseaseFolder: string) {
  const entry = getCatalogEntry(cropFolder, diseaseFolder);
  if (!entry) {
    throw new Error(`No catalog entry for ${cropFolder}/${diseaseFolder}`);
  }
  return entry;
}

function buildReports(): SeedReport[] {
  const reports: SeedReport[] = [];

  // --- Cluster 1: 8 Soybean Yellow Mosaic in Sehore (HIGH) ---
  for (let i = 0; i < 8; i += 1) {
    reports.push({
      cropType: 'Soybean',
      cropFolder: 'soyabean',
      diseaseFolder: 'yellow_mosaic',
      severity: i < 6 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 84 + Math.floor(Math.random() * 12),
      latitude: jitter(SEHORE.lat, 1.8),
      longitude: jitter(SEHORE.lng, 1.8),
      ageHours: Math.floor(Math.random() * 18),
    });
  }

  // --- Cluster 2: 6 Wheat Stripe Rust in Vidisha (MEDIUM) ---
  for (let i = 0; i < 6; i += 1) {
    reports.push({
      cropType: 'Wheat',
      cropFolder: 'wheat',
      diseaseFolder: 'stripe_rust',
      severity: i < 2 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 78 + Math.floor(Math.random() * 12),
      latitude: jitter(VIDISHA.lat, 1.5),
      longitude: jitter(VIDISHA.lng, 1.5),
      ageHours: Math.floor(Math.random() * 16),
    });
  }

  // --- Cluster 3: 5 Tomato Late Blight near Bhopal (LOW/MEDIUM) ---
  for (let i = 0; i < 5; i += 1) {
    reports.push({
      cropType: 'Tomato',
      cropFolder: 'tomato',
      diseaseFolder: 'late_blight',
      severity: i === 0 ? Severity.HIGH : Severity.MEDIUM,
      confidence: 80 + Math.floor(Math.random() * 12),
      latitude: jitter(BHOPAL.lat, 2.0),
      longitude: jitter(BHOPAL.lng, 2.0),
      ageHours: Math.floor(Math.random() * 20),
    });
  }

  // --- Scattered singletons/pairs (variety, no outbreak) ---
  const scattered: Array<{
    cropType: string;
    cropFolder: string;
    diseaseFolder: string;
    anchor: { lat: number; lng: number };
  }> = [
    { cropType: 'Maize', cropFolder: 'maize', diseaseFolder: 'common_rust', anchor: RAISEN },
    { cropType: 'Maize', cropFolder: 'maize', diseaseFolder: 'blight', anchor: HOSHANGABAD },
    { cropType: 'Cotton', cropFolder: 'cotton', diseaseFolder: 'curl_virus', anchor: RAJGARH },
    { cropType: 'Cotton', cropFolder: 'cotton', diseaseFolder: 'bacterial_blight', anchor: RAJGARH },
    { cropType: 'Chilli', cropFolder: 'chilli', diseaseFolder: 'bacterial_spot', anchor: BERASIA },
    { cropType: 'Sugarcane', cropFolder: 'sugarcane', diseaseFolder: 'redrot', anchor: HOSHANGABAD },
    { cropType: 'Rice', cropFolder: 'rice', diseaseFolder: 'blast', anchor: HOSHANGABAD },
    { cropType: 'Sorghum', cropFolder: 'sorghum', diseaseFolder: 'rust', anchor: RAJGARH },
    { cropType: 'Brinjal', cropFolder: 'brinjal', diseaseFolder: 'cercospora_leaf_spot', anchor: BERASIA },
    { cropType: 'Cauliflower', cropFolder: 'cauliflower', diseaseFolder: 'downy_mildew', anchor: BERASIA },
    { cropType: 'Cabbage', cropFolder: 'cabbage', diseaseFolder: 'black_rot', anchor: BERASIA },
    { cropType: 'Groundnut', cropFolder: 'groundnut', diseaseFolder: 'diseased_leaf', anchor: RAJGARH },
    { cropType: 'Sunflower', cropFolder: 'sunflower', diseaseFolder: 'downy_mildew', anchor: RAISEN },
    { cropType: 'Blackgram', cropFolder: 'blackgram', diseaseFolder: 'anthracnose', anchor: RAISEN },
  ];
  for (const s of scattered) {
    const entry = entryOrThrow(s.cropFolder, s.diseaseFolder);
    reports.push({
      cropType: s.cropType,
      cropFolder: s.cropFolder,
      diseaseFolder: s.diseaseFolder,
      severity: SEVERITY_MAP[entry.defaultSeverity],
      confidence: 74 + Math.floor(Math.random() * 16),
      latitude: jitter(s.anchor.lat, 3),
      longitude: jitter(s.anchor.lng, 3),
      ageHours: Math.floor(Math.random() * 24),
    });
  }

  // --- 3 Healthy reports (green branch) ---
  const healthy: Array<{ cropType: string; cropFolder: string }> = [
    { cropType: 'Soybean', cropFolder: 'soyabean' },
    { cropType: 'Wheat', cropFolder: 'wheat' },
    { cropType: 'Sugarcane', cropFolder: 'sugarcane' },
  ];
  for (const h of healthy) {
    reports.push({
      cropType: h.cropType,
      cropFolder: h.cropFolder,
      diseaseFolder: 'healthy',
      severity: Severity.LOW,
      confidence: 91,
      latitude: jitter(BHOPAL.lat, 5),
      longitude: jitter(BHOPAL.lng, 5),
      ageHours: Math.floor(Math.random() * 6),
    });
  }

  return reports;
}

const NOTIFICATION_TEMPLATES = [
  {
    type: 'OUTBREAK' as const,
    title: '⚠️ Severe outbreak nearby',
    body: 'Soybean Yellow Mosaic Virus detected near Sehore · 8 reports.',
    severity: Severity.HIGH,
    ageMinutes: 35,
  },
  {
    type: 'WARNING' as const,
    title: 'Outbreak escalated',
    body: 'Soybean Yellow Mosaic Virus outbreak escalated from medium to high severity.',
    severity: Severity.HIGH,
    ageMinutes: 90,
  },
  {
    type: 'REPORT' as const,
    title: 'High-severity report nearby',
    body: 'A Soybean Yellow Mosaic Virus report was filed near your plot.',
    severity: Severity.HIGH,
    ageMinutes: 180,
  },
  {
    type: 'OUTBREAK' as const,
    title: 'Disease outbreak nearby',
    body: 'Wheat Stripe Rust detected near Vidisha · 6 reports.',
    severity: Severity.MEDIUM,
    ageMinutes: 360,
  },
  {
    type: 'SYSTEM' as const,
    title: 'Welcome to AgroRadar',
    body: 'Add a plot to start receiving outbreak alerts in your area.',
    severity: null,
    ageMinutes: 1440,
  },
];

interface SeedUser {
  phone: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
}

const SEED_USERS: SeedUser[] = [
  { phone: '9999999999', name: 'Mahesh Verma', district: 'Bhopal', lat: BHOPAL.lat, lng: BHOPAL.lng },
  { phone: '8888888888', name: 'Sunita Rajput', district: 'Sehore', lat: SEHORE.lat, lng: SEHORE.lng },
  { phone: '7777777777', name: 'Ramesh Patidar', district: 'Vidisha', lat: VIDISHA.lat, lng: VIDISHA.lng },
  { phone: '7766554433', name: 'Lakhan Yadav', district: 'Raisen', lat: RAISEN.lat, lng: RAISEN.lng },
  { phone: '7755443322', name: 'Geeta Lodhi', district: 'Hoshangabad', lat: HOSHANGABAD.lat, lng: HOSHANGABAD.lng },
  { phone: '7744332211', name: 'Devilal Meena', district: 'Rajgarh', lat: RAJGARH.lat, lng: RAJGARH.lng },
  { phone: '7733221100', name: 'Kailash Dangi', district: 'Berasia', lat: BERASIA.lat, lng: BERASIA.lng },
];

async function seed(): Promise<void> {
  logger.info('▶ Starting demo seed (Bhopal region)…');

  const users = [];
  for (const u of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { phone: u.phone },
      create: {
        phone: u.phone,
        name: u.name,
        district: u.district,
        state: 'Madhya Pradesh',
        latitude: u.lat,
        longitude: u.lng,
      },
      update: {
        name: u.name,
        district: u.district,
        state: 'Madhya Pradesh',
        latitude: u.lat,
        longitude: u.lng,
      },
    });
    users.push(user);
  }
  const userA = users[0]!; // Mahesh Verma — primary demo login
  logger.info(`✓ ${users.length} users ready`);

  // Plots near each cluster, owned by relevant users. Idempotent on (userId, name).
  const plots = [
    { userId: userA.id, name: 'Bhopal Kolar Soybean', latitude: BHOPAL.lat - 0.05, longitude: BHOPAL.lng - 0.02, cropTypes: ['Soybean'] },
    { userId: userA.id, name: 'Bhopal Berasia Wheat', latitude: BHOPAL.lat + 0.18, longitude: BHOPAL.lng + 0.06, cropTypes: ['Wheat'] },
    { userId: users[1]!.id, name: 'Sehore Soybean Field', latitude: SEHORE.lat + 0.01, longitude: SEHORE.lng - 0.005, cropTypes: ['Soybean'] },
    { userId: users[2]!.id, name: 'Vidisha Wheat Field', latitude: VIDISHA.lat - 0.01, longitude: VIDISHA.lng + 0.01, cropTypes: ['Wheat'] },
  ];
  for (const p of plots) {
    const existing = await prisma.plot.findFirst({ where: { userId: p.userId, name: p.name } });
    if (existing) {
      await prisma.plot.update({ where: { id: existing.id }, data: { ...p, active: true } });
    } else {
      await prisma.plot.create({ data: p });
    }
  }
  logger.info(`✓ ${plots.length} plots seeded`);

  // Reports — keyed by clientId for idempotency; attributed round-robin.
  const reports = buildReports();
  let created = 0;
  let updated = 0;
  for (let i = 0; i < reports.length; i += 1) {
    const r = reports[i]!;
    const entry = entryOrThrow(r.cropFolder, r.diseaseFolder);
    const owner = users[i % users.length]!;
    const clientId = `seed:report:${i}`;
    const createdAt = new Date(Date.now() - r.ageHours * 60 * 60 * 1000);
    const { imageUrl, imagePublicId } = imageFor(r.cropFolder, r.diseaseFolder, i);
    const data = {
      userId: owner.id,
      clientId,
      cropType: r.cropType,
      imageUrl,
      imagePublicId,
      latitude: r.latitude,
      longitude: r.longitude,
      notes: null,
      disease: entry.displayName,
      confidence: r.confidence,
      severity: r.severity,
      recommendations: entry.recommendations,
      processingStatus: ProcessingStatus.SUCCESS,
      processedAt: new Date(createdAt.getTime() + 4_000),
      createdAt,
    };
    const existing = await prisma.report.findUnique({
      where: { userId_clientId: { userId: owner.id, clientId } },
    });
    if (existing) {
      await prisma.report.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.report.create({ data });
      created += 1;
    }
  }
  logger.info(`✓ Reports: ${created} created, ${updated} updated`);

  // Notifications for the primary user. Idempotent: clear seed-* and re-insert.
  await prisma.notification.deleteMany({
    where: { userId: userA.id, title: { contains: 'outbreak nearby' } },
  });
  for (let i = 0; i < NOTIFICATION_TEMPLATES.length; i += 1) {
    const t = NOTIFICATION_TEMPLATES[i]!;
    await prisma.notification.create({
      data: {
        userId: userA.id,
        type: t.type,
        title: t.title,
        body: t.body,
        severity: t.severity,
        read: i < 2,
        readAt: i < 2 ? new Date() : null,
        data: {},
        createdAt: new Date(Date.now() - t.ageMinutes * 60 * 1000),
      },
    });
  }
  logger.info(`✓ ${NOTIFICATION_TEMPLATES.length} notifications seeded for primary user`);

  // Outbreak zones — built from contributing cluster reports.
  const soybeanReports = reports.filter(
    (r) => r.cropFolder === 'soyabean' && r.diseaseFolder === 'yellow_mosaic',
  );
  const wheatReports = reports.filter(
    (r) => r.cropFolder === 'wheat' && r.diseaseFolder === 'stripe_rust',
  );
  const tomatoReports = reports.filter(
    (r) => r.cropFolder === 'tomato' && r.diseaseFolder === 'late_blight',
  );

  await prisma.outbreakZone.deleteMany({
    where: {
      disease: {
        in: ['Yellow Mosaic Virus', 'Stripe Rust (Yellow Rust)', 'Late Blight'],
      },
    },
  });

  await prisma.outbreakZone.create({
    data: {
      disease: 'Yellow Mosaic Virus',
      latitude: SEHORE.lat,
      longitude: SEHORE.lng,
      radius: 5000,
      reportCount: soybeanReports.length,
      highCount: soybeanReports.filter((r) => r.severity === Severity.HIGH).length,
      severity: Severity.HIGH,
      affectedCropTypes: ['Soybean'],
      active: true,
      lastSeenAt: new Date(),
    },
  });
  await prisma.outbreakZone.create({
    data: {
      disease: 'Stripe Rust (Yellow Rust)',
      latitude: VIDISHA.lat,
      longitude: VIDISHA.lng,
      radius: 4500,
      reportCount: wheatReports.length,
      highCount: wheatReports.filter((r) => r.severity === Severity.HIGH).length,
      severity: Severity.MEDIUM,
      affectedCropTypes: ['Wheat'],
      active: true,
      lastSeenAt: new Date(),
    },
  });
  await prisma.outbreakZone.create({
    data: {
      disease: 'Late Blight',
      latitude: BHOPAL.lat,
      longitude: BHOPAL.lng,
      radius: 4000,
      reportCount: tomatoReports.length,
      highCount: tomatoReports.filter((r) => r.severity === Severity.HIGH).length,
      severity: Severity.LOW,
      affectedCropTypes: ['Tomato'],
      active: true,
      lastSeenAt: new Date(),
    },
  });
  logger.info('✓ 3 outbreak zones seeded (HIGH Sehore, MEDIUM Vidisha, LOW Bhopal)');

  logger.info('✅ Demo seed complete.');
}

seed()
  .catch((err) => {
    logger.error('Demo seed failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter backend exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Run existing backend tests**

Run: `pnpm --filter backend test`
Expected: PASS — including the new catalog spec; no regressions.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/seed-demo.ts
git commit -m "feat(seed): rebuild demo seed from real crop images + catalog"
```

---

## Task 5: Rewrite the mobile dashboard mock

**Files:**
- Modify: `apps/mobile/src/features/dashboard/mocks/dashboard.mock.ts` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/mobile/src/features/dashboard/mocks/dashboard.mock.ts` with:

```ts
import type {
  Alert,
  DashboardData,
  Outbreak,
  Report,
  Trend,
} from '../types';
import cropImageUrls from './crop-image-urls.json';

/**
 * Offline fallback data for the dashboard. Images use real Cloudinary URLs
 * (written by the backend `upload:crop-images` script into crop-image-urls.json)
 * keyed by "<crop>/<disease>". Falls back to picsum if a key is missing so the
 * dashboard never breaks. Geography matches the Bhopal-region demo seed.
 */

const urls = cropImageUrls as Record<string, string>;

const cropImage = (key: string): string =>
  urls[key] ??
  `https://picsum.photos/seed/${encodeURIComponent(key.replace('/', '-'))}/640/480`;

const minutesAgo = (mins: number): string =>
  new Date(Date.now() - mins * 60_000).toISOString();

export const mockOutbreaks: Outbreak[] = [
  {
    id: 'out-1',
    disease: 'Yellow Mosaic Virus',
    cropType: 'Soybean',
    affectedVillages: 8,
    severity: 'high',
    district: 'Sehore',
    trendPercent: 24,
  },
  {
    id: 'out-2',
    disease: 'Stripe Rust',
    cropType: 'Wheat',
    affectedVillages: 6,
    severity: 'medium',
    district: 'Vidisha',
    trendPercent: 11,
  },
  {
    id: 'out-3',
    disease: 'Late Blight',
    cropType: 'Tomato',
    affectedVillages: 5,
    severity: 'low',
    district: 'Bhopal',
    trendPercent: -3,
  },
];

export const mockReports: Report[] = [
  {
    id: 'rep-1',
    crop: 'Soybean',
    disease: 'Yellow Mosaic Virus',
    severity: 'high',
    imageUrl: cropImage('soyabean/yellow_mosaic'),
    status: 'flagged',
    createdAt: minutesAgo(120),
    district: 'Sehore',
  },
  {
    id: 'rep-2',
    crop: 'Wheat',
    disease: 'Stripe Rust',
    severity: 'medium',
    imageUrl: cropImage('wheat/stripe_rust'),
    status: 'reviewed',
    createdAt: minutesAgo(280),
    district: 'Vidisha',
  },
  {
    id: 'rep-3',
    crop: 'Tomato',
    disease: 'Late Blight',
    severity: 'high',
    imageUrl: cropImage('tomato/late_blight'),
    status: 'flagged',
    createdAt: minutesAgo(540),
    district: 'Bhopal',
  },
  {
    id: 'rep-4',
    crop: 'Maize',
    disease: 'Common Rust',
    severity: 'medium',
    imageUrl: cropImage('maize/common_rust'),
    status: 'reviewed',
    createdAt: minutesAgo(900),
    district: 'Raisen',
  },
  {
    id: 'rep-5',
    crop: 'Cotton',
    disease: 'Leaf Curl Virus',
    severity: 'high',
    imageUrl: cropImage('cotton/curl_virus'),
    status: 'pending',
    createdAt: minutesAgo(1320),
    district: 'Rajgarh',
  },
  {
    id: 'rep-6',
    crop: 'Chilli',
    disease: 'Bacterial Leaf Spot',
    severity: 'medium',
    imageUrl: cropImage('chilli/bacterial_spot'),
    status: 'reviewed',
    createdAt: minutesAgo(1600),
    district: 'Berasia',
  },
];

export const mockTrends: Trend[] = [
  { id: 'tr-1', disease: 'Yellow Mosaic Virus', deltaPercent: 18, history: [3, 4, 4, 5, 6, 7, 8] },
  { id: 'tr-2', disease: 'Stripe Rust', deltaPercent: -4, history: [6, 6, 5, 5, 4, 5, 4] },
  { id: 'tr-3', disease: 'Late Blight', deltaPercent: 6, history: [2, 3, 3, 4, 4, 5, 5] },
  { id: 'tr-4', disease: 'Common Rust', deltaPercent: 0, history: [3, 3, 3, 3, 3, 3, 3] },
];

export const mockAlerts: Alert[] = [
  {
    id: 'al-1',
    title: 'Soybean Yellow Mosaic outbreak nearby',
    description: '8 villages flagged near Sehore. Immediate field check recommended.',
    severity: 'high',
    unread: true,
    createdAt: minutesAgo(35),
  },
  {
    id: 'al-2',
    title: 'New report verified',
    description: 'A nearby report was reviewed by the district officer.',
    severity: 'medium',
    unread: true,
    createdAt: minutesAgo(180),
  },
  {
    id: 'al-3',
    title: 'Weather advisory',
    description: 'High humidity expected — fungal risk elevated for the next 48h.',
    severity: 'low',
    unread: false,
    createdAt: minutesAgo(420),
  },
  {
    id: 'al-4',
    title: 'Late blight trending down',
    description: 'Fewer reports vs last week in your region. Keep monitoring.',
    severity: 'low',
    unread: false,
    createdAt: minutesAgo(720),
  },
];

export const mockDashboard: DashboardData = {
  summary: {
    activeOutbreaks: mockOutbreaks.length + 2,
    highSeverityZones: mockOutbreaks.filter((o) => o.severity === 'high').length + 1,
    reportsThisWeek: 47,
  },
  outbreaks: mockOutbreaks,
  recentReports: mockReports,
  trends: mockTrends,
  alerts: mockAlerts,
};
```

- [ ] **Step 2: Typecheck the mobile app**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS. If it fails with a JSON-import error, confirm `resolveJsonModule` is enabled in the mobile `tsconfig.json` and enable it if missing.

- [ ] **Step 3: Run mobile tests (severity etc.)**

Run: `pnpm --filter mobile test`
Expected: PASS — existing tests unaffected.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/dashboard/mocks/dashboard.mock.ts
git commit -m "feat(mobile): rebuild dashboard mock with real images + Bhopal geography"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Backend build**

Run: `pnpm --filter backend build`
Expected: PASS — `nest build` compiles cleanly.

- [ ] **Step 2: Full backend test suite**

Run: `pnpm --filter backend test`
Expected: PASS.

- [ ] **Step 3: Confirm seed runs against the placeholder manifest (optional, needs DB)**

If a `DATABASE_URL` is configured: `pnpm --filter backend seed:demo`
Expected: completes with "✅ Demo seed complete." Reports use picsum fallbacks
until the upload script has been run. Skip if no DB is available.

- [ ] **Step 4: Document the manual upload step**

Confirm the README or PROGRESS.md notes the one-time command:
`pnpm --filter backend upload:crop-images` (requires `CLOUDINARY_*` env vars),
run before `seed:demo` to get real images. Add a one-line note to PROGRESS.md if
absent.

---

## Manual step (user-run, outside this plan)

After Task 6, the user runs once with Cloudinary creds set:

```bash
pnpm --filter backend upload:crop-images
pnpm --filter backend seed:demo
```

The first command overwrites `crop-image-manifest.json` and
`crop-image-urls.json` with real Cloudinary URLs; the second reseeds the DB so
every report's image matches its crop and disease.
