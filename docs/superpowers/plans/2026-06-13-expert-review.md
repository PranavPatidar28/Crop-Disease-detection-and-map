# Expert Review / Professional Advice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show farmers a professional/agronomist review (status + advice + tips) on the report detail screen, as demo-only UI driven by deterministic client-side mock data.

**Architecture:** An `ExpertReview` is computed at render time from a pure hash of the report `id` (stable across the detail screen's 3s polling). A new `ExpertReviewCard` renders it on `app/reports/[id].tsx` between the recommendations and the action buttons. No backend, no expert-side UI, no i18n, no new test runner — matching the `master` base branch.

**Tech Stack:** Expo Router, React Native, NativeWind/Tailwind, react-native-reanimated, lucide-react-native. Custom JSX primitives from `@/tw`.

**Base branch:** `feat/expert-review` (off `master`). Worktree: `.worktrees/expert-review`. All commands run from the repo root inside that worktree.

---

### Task 1: Add `ExpertReview` types

**Files:**
- Modify: `apps/mobile/src/features/upload-report/types.ts` (append after the `Report` interface, end of file)

- [ ] **Step 1: Append the types**

Add to the end of `apps/mobile/src/features/upload-report/types.ts`:

```ts

/**
 * Professional / agronomist review of a report. Demo-only — generated
 * client-side (see features/disease-analysis/mocks/expert-review.mock.ts),
 * never persisted or fetched. Not part of the backend `Report` shape.
 */
export type ExpertReviewStatus = 'PENDING' | 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';

export interface ExpertReviewer {
  /** Display name, e.g. "Dr. Anil Kanade". */
  name: string;
  /** Role + institution, e.g. "Agronomist, KVK Pune". */
  credential: string;
}

export interface ExpertReview {
  status: ExpertReviewStatus;
  expert: ExpertReviewer;
  /** Free-text guidance paragraph. Empty string while PENDING. */
  adviceNote: string;
  /** Recommended action bullets. Empty array while PENDING. */
  tips: string[];
  /** ISO timestamp; null while PENDING. */
  reviewedAt: string | null;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/upload-report/types.ts
git commit -m "feat(expert-review): add ExpertReview types"
```

---

### Task 2: Add the deterministic mock generator

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/mocks/expert-review.mock.ts`

- [ ] **Step 1: Create the generator file**

Create `apps/mobile/src/features/disease-analysis/mocks/expert-review.mock.ts` with exactly:

```ts
import type {
  ExpertReview,
  ExpertReviewStatus,
  ExpertReviewer,
  Report,
} from '@/features/upload-report/types';

/**
 * DEMO-ONLY. There is no expert-review backend yet. This derives a plausible,
 * STABLE professional review from a report so the farmer-facing UI is always
 * populated. Determinism matters: the report detail screen refetches every 3s
 * while processing, and the card must not flicker or change between refetches —
 * so every choice is driven purely by a hash of `report.id`.
 */

/** FNV-1a 32-bit hash → unsigned int. Pure, stable for a given string. */
function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const EXPERTS: ExpertReviewer[] = [
  { name: 'Dr. Anil Kanade', credential: 'Agronomist, KVK Pune' },
  { name: 'Dr. Meera Joshi', credential: 'Plant Pathologist, MPKV Rahuri' },
  { name: 'Sunil Patil', credential: 'Extension Officer, Dept. of Agriculture' },
  { name: 'Dr. Rekha Naik', credential: 'Crop Scientist, ICAR' },
  { name: 'Vikram Deshmukh', credential: 'Senior Agronomist, KVK Nashik' },
];

/** Reports newer than this are still "awaiting" a reviewer. */
const PENDING_WINDOW_MS = 10 * 60 * 1000;

function pickStatus(hash: number): Exclude<ExpertReviewStatus, 'PENDING'> {
  const bucket = hash % 10;
  if (bucket <= 6) return 'APPROVED'; // 70%
  if (bucket <= 8) return 'NEEDS_REVISION'; // 20%
  return 'REJECTED'; // 10%
}

function buildNote(
  status: Exclude<ExpertReviewStatus, 'PENDING'>,
  report: Report,
): string {
  const disease = report.disease ?? 'the reported issue';
  const high = report.severity === 'HIGH';
  switch (status) {
    case 'APPROVED':
      return high
        ? `I've reviewed your photo and the AI diagnosis of ${disease} looks correct. This is a high-severity case — act quickly to stop it spreading to neighbouring plants.`
        : `I've reviewed your photo and agree with the AI diagnosis of ${disease}. It's at an early, manageable stage. Follow the steps below and monitor over the next few days.`;
    case 'NEEDS_REVISION':
      return `The symptoms are consistent with ${disease}, but the photo isn't fully conclusive. Please share a clearer close-up of an affected leaf (top and underside) so I can confirm before you start treatment.`;
    case 'REJECTED':
      return `I'm not able to confirm ${disease} from this image. The pattern looks more like a nutrient or watering issue. Hold off on spraying and check the recommendations below first.`;
  }
}

function buildTips(
  status: Exclude<ExpertReviewStatus, 'PENDING'>,
  report: Report,
): string[] {
  const high = report.severity === 'HIGH';
  switch (status) {
    case 'APPROVED':
      return high
        ? [
            'Remove and destroy badly affected plants today to limit spread.',
            'Apply the recommended fungicide early morning or late evening.',
            'Isolate this plot — avoid moving tools or water runoff to healthy fields.',
            'Re-photograph and report again in 3 days to track the response.',
          ]
        : [
            'Remove visibly affected leaves and dispose of them away from the field.',
            'Improve airflow — avoid overhead watering that keeps foliage wet.',
            'Apply the suggested treatment at the labelled dose; do not over-spray.',
            'Recheck the plot after 4–5 days.',
          ];
    case 'NEEDS_REVISION':
      return [
        'Take a sharp close-up of one affected leaf, both sides, in daylight.',
        'Include a wider shot showing how many plants are affected.',
        'Note when symptoms first appeared and recent weather.',
        'Avoid spraying until the diagnosis is confirmed.',
      ];
    case 'REJECTED':
      return [
        'Check soil moisture — both waterlogging and drought can mimic disease.',
        'Inspect for nutrient deficiency (yellowing patterns, leaf margins).',
        'Submit a fresh report if symptoms worsen or spread.',
      ];
  }
}

/**
 * Returns a stable mock expert review for a report. Same `report.id` always
 * yields the same review. Reports created within the last ~10 minutes are
 * returned as PENDING (no reviewer assigned yet).
 */
export function getExpertReview(report: Report): ExpertReview {
  const hash = hashString(report.id);
  const expert = EXPERTS[hash % EXPERTS.length] as ExpertReviewer;

  const ageMs = Date.now() - new Date(report.createdAt).getTime();
  if (ageMs < PENDING_WINDOW_MS) {
    return {
      status: 'PENDING',
      expert,
      adviceNote: '',
      tips: [],
      reviewedAt: null,
    };
  }

  const status = pickStatus(hash);
  // Reviewed 5–125 minutes ago, derived from the hash so it stays stable.
  const reviewedMinsAgo = 5 + (hash % 120);
  return {
    status,
    expert,
    adviceNote: buildNote(status, report),
    tips: buildTips(status, report),
    reviewedAt: new Date(Date.now() - reviewedMinsAgo * 60_000).toISOString(),
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS. (If `noUncheckedIndexedAccess` flags the `EXPERTS[...]` access, the `as ExpertReviewer` cast already handles it.)

- [ ] **Step 3: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS (no new errors for this file).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/mocks/expert-review.mock.ts
git commit -m "feat(expert-review): add deterministic mock review generator"
```

---

### Task 3: Build the `ExpertReviewCard` component

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/components/expert-review-card.tsx`

- [ ] **Step 1: Create the component**

Create `apps/mobile/src/features/disease-analysis/components/expert-review-card.tsx` with exactly:

```tsx
import { CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react-native';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { SectionLabel } from '@/components/ui/section-label';
import { lightColors, palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { ExpertReview, ExpertReviewStatus } from '@/features/upload-report/types';
import { timeAgo } from '@/utils/severity';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

interface StatusVisual {
  label: string;
  tone: Tone;
}

const STATUS_VISUALS: Record<Exclude<ExpertReviewStatus, 'PENDING'>, StatusVisual> = {
  APPROVED: { label: 'Approved', tone: 'success' },
  NEEDS_REVISION: { label: 'Needs revision', tone: 'warning' },
  REJECTED: { label: 'Not confirmed', tone: 'danger' },
};

function StatusIcon({ status }: { status: Exclude<ExpertReviewStatus, 'PENDING'> }) {
  const size = 16;
  const strokeWidth = 2.2;
  switch (status) {
    case 'APPROVED':
      return <CheckCircle2 size={size} color={palette.status.success} strokeWidth={strokeWidth} />;
    case 'NEEDS_REVISION':
      return <ShieldAlert size={size} color={palette.status.warning} strokeWidth={strokeWidth} />;
    case 'REJECTED':
      return <XCircle size={size} color={palette.status.danger} strokeWidth={strokeWidth} />;
  }
}

/**
 * Farmer-facing professional review of a report. Demo-only data (see
 * expert-review.mock.ts). Two states: awaiting review (PENDING) and reviewed.
 */
export function ExpertReviewCard({ review }: { review: ExpertReview }) {
  if (review.status === 'PENDING') {
    return (
      <Card variant="glow" padding="md">
        <View className="flex-row items-center justify-between">
          <SectionLabel>Expert review</SectionLabel>
          <Chip
            label="Awaiting review"
            tone="neutral"
            leftSlot={<Clock size={12} color={lightColors.textMuted} strokeWidth={2.4} />}
          />
        </View>
        <View className="mt-3 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <Clock size={18} color={palette.brand[600]} strokeWidth={2.2} />
          </View>
          <Text className="flex-1 text-sm leading-5 text-text-muted">
            An agronomist will review your report shortly.
          </Text>
        </View>
      </Card>
    );
  }

  const visual = STATUS_VISUALS[review.status];

  return (
    <Card variant="glow" padding="md">
      <View className="flex-row items-center justify-between">
        <SectionLabel>Expert review</SectionLabel>
        <Chip
          label={visual.label}
          tone={visual.tone}
          leftSlot={<StatusIcon status={review.status} />}
        />
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <Avatar name={review.expert.name} size="md" verified={review.status === 'APPROVED'} />
        <View className="flex-1">
          <Text className="text-sm font-bold text-text">{review.expert.name}</Text>
          <Text className="text-xs text-text-subtle">{review.expert.credential}</Text>
        </View>
      </View>

      {review.adviceNote ? (
        <Text className="mt-3 text-sm leading-5 text-text">{review.adviceNote}</Text>
      ) : null}

      {review.tips.length > 0 ? (
        <View className="mt-4 gap-2">
          <SectionLabel>Expert tips</SectionLabel>
          <View className="mt-1 gap-2">
            {review.tips.map((tip, i) => (
              <View key={`${i}-${tip.slice(0, 20)}`} className="flex-row items-start gap-2.5">
                <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-success-tint">
                  <Text className="text-[10px] font-bold text-success">{i + 1}</Text>
                </View>
                <Text className="flex-1 text-sm leading-5 text-text">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {review.reviewedAt ? (
        <Text className="mt-3 text-[11px] text-text-subtle">
          Reviewed {timeAgo(review.reviewedAt)}
        </Text>
      ) : null}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS. (Token names are pre-verified against `apps/mobile/src/theme/colors.ts`: `palette.status.{success,warning,danger}`, `palette.brand[...]`, and `lightColors.textMuted` all exist. `textMuted` lives on `lightColors`, not `palette` — the import already accounts for this.)

- [ ] **Step 3: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/components/expert-review-card.tsx
git commit -m "feat(expert-review): add farmer-facing ExpertReviewCard"
```

---

### Task 4: Wire the card into the report detail screen

**Files:**
- Modify: `apps/mobile/src/app/reports/[id].tsx`

- [ ] **Step 1: Add imports**

In `apps/mobile/src/app/reports/[id].tsx`, after the existing import on line 17
(`import { SeverityBadge } ...`), add these two imports (keep alphabetical-ish grouping with the other `@/features/disease-analysis` imports):

```tsx
import { ExpertReviewCard } from '@/features/disease-analysis/components/expert-review-card';
import { getExpertReview } from '@/features/disease-analysis/mocks/expert-review.mock';
```

- [ ] **Step 2: Insert the card between recommendations and actions**

Find this block (currently lines ~149–155):

```tsx
              <Animated.View entering={FadeInDown.delay(260).duration(400)}>
                <ResultActions
                  report={report}
                  onUploadAnother={() => router.replace('/upload')}
                  onViewOnMap={() => router.push('/map')}
                />
              </Animated.View>
```

Replace it with (adds the expert card before it at delay 240, bumps actions to 300):

```tsx
              <Animated.View entering={FadeInDown.delay(240).duration(400)}>
                <ExpertReviewCard review={getExpertReview(report)} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                <ResultActions
                  report={report}
                  onUploadAnother={() => router.replace('/upload')}
                  onViewOnMap={() => router.push('/map')}
                />
              </Animated.View>
```

- [ ] **Step 3: Bump the disclaimer delay so the cascade stays ordered**

Find the disclaimer block (currently line ~157):

```tsx
              <Animated.View entering={FadeInDown.delay(320).duration(400)}>
                <Text className="px-2 text-[11px] text-text-subtle">
```

Change `delay(320)` to `delay(360)`:

```tsx
              <Animated.View entering={FadeInDown.delay(360).duration(400)}>
                <Text className="px-2 text-[11px] text-text-subtle">
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/app/reports/[id].tsx
git commit -m "feat(expert-review): render ExpertReviewCard on report detail screen"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full typecheck + lint**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.

Run: `pnpm --filter mobile lint`
Expected: PASS.

- [ ] **Step 2: Sanity-read the screen**

Open `apps/mobile/src/app/reports/[id].tsx` and confirm the result branch order is:
hero → confidence card → (notes?) → recommendations (200) → expert review (240) → actions (300) → disclaimer (360). Delays strictly increasing.

- [ ] **Step 3: Confirm clean working tree**

Run: `git status`
Expected: clean (all changes committed across Tasks 1–4).

---

## Self-review notes

- **Spec coverage:** types (Task 1) ✔, deterministic generator with pending window + status distribution + tailored advice (Task 2) ✔, pending + reviewed card states with status chip / expert identity / note / tips / reviewed-time (Task 3) ✔, wiring with ordered delays (Task 4) ✔, typecheck+lint verification, no test runner (Task 5) ✔.
- **No i18n / no jest:** matches `master` base branch per spec's base-branch note.
- **Type consistency:** `getExpertReview(report: Report): ExpertReview`; `ExpertReviewCard({ review: ExpertReview })`; `STATUS_VISUALS` keyed by the non-PENDING statuses; `tone` union is a subset of `Chip`'s `Tone`. Consistent across tasks.
- **Theme tokens pre-verified** against `apps/mobile/src/theme/colors.ts`: `palette.status.{success,warning,danger}` and `palette.brand[...]` exist on `palette`; `textMuted` is on `lightColors` (component imports both).
