# Expert Review / Professional Advice — Design

> **Date:** 2026-06-13
> **Branch:** `feat/expert-review`
> **Status:** Approved, ready for implementation plan
> **Scope:** UI-only (mobile, farmer-facing). No backend, no expert-side screens.

## Problem

Farmers submit disease reports and get an AI diagnosis. We want to show that a
human professional (agronomist / extension officer) has reviewed the report and
left guidance. For the hackathon this is **demo UI only** — there is no backend
review workflow and no expert-facing interface. Every report should appear to
have (or be awaiting) an expert review so the feature is always visible.

## Scope

**In scope**

- A mock `ExpertReview` data shape attached to each report, client-side only.
- A deterministic generator that derives a stable review from a report's `id`
  (stable across the 3s polling refetch on the detail screen).
- A farmer-facing `ExpertReviewCard` shown on the report detail screen, below the
  AI advisory section.
- i18n strings for all new copy (English source + Hindi partial).

**Out of scope (YAGNI)**

- Expert-side screens, review queue, role toggle.
- Backend models, endpoints, persistence.
- Report-list status badges.
- Editing / submitting reviews.

## Approach

The expert review is generated client-side, mirroring the existing
`dashboard.mock.ts` fallback-data convention. A deterministic hash of the report
`id` selects the expert and status so the card does not flicker or change when
`use-report.ts` refetches every 3 seconds.

Alternative considered: a single hardcoded static review. Rejected — a
deterministic generator gives variety across reports (different experts,
statuses, tailored advice) for a more convincing demo while staying stable per
report.

## Data shape

Added to `apps/mobile/src/features/upload-report/types.ts`, next to `Report`:

```ts
export type ExpertReviewStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'REJECTED';

export interface ExpertReviewer {
  name: string;        // e.g. "Dr. Anil Kanade"
  credential: string;  // e.g. "Agronomist, KVK Pune"
}

export interface ExpertReview {
  status: ExpertReviewStatus;
  expert: ExpertReviewer;
  adviceNote: string;        // free-text guidance paragraph
  tips: string[];            // 3-4 recommended action bullets
  reviewedAt: string | null; // ISO timestamp; null while PENDING
}
```

The `ExpertReview` is **not** added to the `Report` interface — it is computed on
demand by the generator at render time, keeping the report type backend-faithful.

## Mock generator

New file: `apps/mobile/src/features/disease-analysis/mocks/expert-review.mock.ts`

```ts
export function getExpertReview(report: Report): ExpertReview
```

Behavior:

- Deterministic 32-bit hash of `report.id` drives all random choices (expert
  pick, status pick, template pick) so output is stable per report.
- **Status rule:** reports created less than ~10 minutes ago → `PENDING`.
  Otherwise the hash distributes across mostly `APPROVED`, occasionally
  `NEEDS_REVISION`, rarely `REJECTED`. A `PENDING` review has `reviewedAt = null`
  and empty `tips` / minimal note.
- A small pool (4-5) of plausible experts with credentials tied to Indian KVK /
  agri-university context (matching the app's demo geography).
- `adviceNote` and `tips` chosen from a couple of templates, lightly tailored by
  the report's `severity` (and `disease` name when present) so high-severity
  reports read more urgently.

## Farmer-facing component

New file:
`apps/mobile/src/features/disease-analysis/components/expert-review-card.tsx`

A `Card variant="glow"` matching the detail screen's existing cards. Two render
states:

**PENDING**

- Muted tone. Clock icon (lucide `Clock`) in a tinted container.
- Title: "Expert review" + a `Chip tone="neutral"` labelled "Awaiting review".
- Body copy: "An agronomist will review your report shortly."

**Reviewed (APPROVED / NEEDS_REVISION / REJECTED)**

- Status `Chip`: `APPROVED` → `success`, `NEEDS_REVISION` → `warning`,
  `REJECTED` → `danger`, with matching label text.
- Expert identity row: `Avatar` (initials) + name + credential line.
- Advice note paragraph.
- "Expert tips" — numbered list styled like `RecommendationsList`.
- Footer: "Reviewed {timeAgo}" using the existing `timeAgo` helper.

Imports primitives from `@/tw`, styles with semantic Tailwind tokens, taps (none
expected here, it is display-only) follow existing conventions. Entrance:
`AnimatedView entering={FadeInDown.delay(240).duration(400)}`.

## Wiring

In `apps/mobile/src/app/reports/[id].tsx`, inside the SUCCESS/result branch,
the expert review card sits **between** the advisory section and the actions so
the top-to-bottom layout matches the entrance cascade:

1. Advisory `AnimatedView` — delay 200 (unchanged)
2. `<ExpertReviewCard review={expertReview} />` — delay 240 (new)
3. `ResultActions` — bumped from delay 260 to delay 300

Compute `const expertReview = getExpertReview(report)` once in the result branch
and pass it to the card. Keeping delays strictly increasing down the page
preserves the existing staggered effect.

## i18n

Add an `expertReview` section to `apps/mobile/src/i18n/translations/en.ts` (and a
Hindi partial in `hi.ts`):

- `expertReview.title` — "Expert review"
- `expertReview.awaiting` — "Awaiting review"
- `expertReview.pendingBody` — "An agronomist will review your report shortly."
- `expertReview.statusApproved` — "Approved"
- `expertReview.statusNeedsRevision` — "Needs revision"
- `expertReview.statusRejected` — "Not confirmed"
- `expertReview.tipsTitle` — "Expert tips"
- `expertReview.reviewedAgo` — "Reviewed {{time}}"

All catalog values flow through `useTranslation()`. The mock generator's
`adviceNote` / `tips` / expert names are demo content and may stay in the
generator (not catalog) for the hackathon, consistent with `dashboard.mock.ts`.

## Testing / verification

- `pnpm --filter mobile typecheck` clean.
- `pnpm --filter mobile lint` clean.
- A small unit test for `getExpertReview` determinism (same `id` → same review;
  recent `createdAt` → `PENDING`), matching the existing
  `filter-reports.test.ts` convention.

## Files touched

| File | Change |
| ---- | ------ |
| `features/upload-report/types.ts` | add `ExpertReview*` types |
| `features/disease-analysis/mocks/expert-review.mock.ts` | new generator |
| `features/disease-analysis/mocks/expert-review.mock.test.ts` | new test |
| `features/disease-analysis/components/expert-review-card.tsx` | new component |
| `features/disease-analysis/index.ts` (or barrel) | export card if barrel exists |
| `app/reports/[id].tsx` | render the card |
| `i18n/translations/en.ts` | add `expertReview` keys |
| `i18n/translations/hi.ts` | add Hindi partial |
