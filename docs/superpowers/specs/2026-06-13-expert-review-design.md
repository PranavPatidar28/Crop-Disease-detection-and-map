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
  AI recommendations section.

> **Base-branch note:** This work branches off `master`. On `master` the report
> detail screen uses **hardcoded English strings** (e.g. "Recommended actions",
> "Your notes") — there is no `i18n/` layer and no test runner (`jest`). The
> i18n catalog and a richer advisory renderer exist only on an unmerged feature
> branch. To avoid entangling with that in-flight work, this feature follows
> `master`'s actual conventions: hardcoded copy, no new test harness.

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
the expert review card sits **between** the "Recommended actions" section and the
`ResultActions` button row so the top-to-bottom layout matches the entrance
cascade:

1. "Recommended actions" `Animated.View` — delay 200 (unchanged)
2. `<ExpertReviewCard review={expertReview} />` — delay 240 (new)
3. `ResultActions` `Animated.View` — bumped from delay 260 to delay 300
4. Disclaimer footnote `Animated.View` — bumped from delay 320 to delay 360

Compute `const expertReview = getExpertReview(report)` once in the result branch
and pass it to the card. Keeping delays strictly increasing down the page
preserves the existing staggered effect.

## Copy

All user-facing strings are hardcoded English inside the component, matching the
report detail screen's existing convention on `master` (e.g. "Recommended
actions", "Your notes"). No `i18n/` layer exists on this base branch, so adding
one is out of scope. Labels used:

- Section title: "Expert review"
- Pending chip: "Awaiting review"; pending body: "An agronomist will review your
  report shortly."
- Status labels: APPROVED → "Approved", NEEDS_REVISION → "Needs revision",
  REJECTED → "Not confirmed"
- Tips header: "Expert tips"
- Footer: "Reviewed {timeAgo}" via the existing `timeAgo` helper.

## Testing / verification

`master` has **no test runner** (no `jest`, no `test` script in
`apps/mobile/package.json`). Standing one up is out of scope for a UI-only demo.
Verification is:

- `pnpm --filter mobile typecheck` clean.
- `pnpm --filter mobile lint` clean.

Generator determinism is instead guaranteed by construction (pure hash of
`report.id`) and reviewed by reading the code.

## Files touched

| File | Change |
| ---- | ------ |
| `features/upload-report/types.ts` | add `ExpertReview*` types |
| `features/disease-analysis/mocks/expert-review.mock.ts` | new generator |
| `features/disease-analysis/components/expert-review-card.tsx` | new component |
| `app/reports/[id].tsx` | render the card |
