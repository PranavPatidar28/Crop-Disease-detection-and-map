# Reports History Page — Design

**Date:** 2026-06-13
**Status:** Approved (design phase)
**Area:** `apps/mobile` — reports history / navigation / notifications

## Problem

The app already has a working "Your reports" history screen
(`apps/mobile/src/app/reports/index.tsx`): infinite list, pull-to-refresh,
loading / empty / error states, backed by `useMyReports()` →
`GET /reports?scope=mine`, rendering `ReportHistoryCard` rows.

The real gaps are:

1. **Discoverability.** It is only reachable from the dashboard "View all" link
   (`features/dashboard/components/recent-reports.tsx`). There is no tab for it,
   and the Profile reports stat tile is not pressable.
2. **No filtering / search.** The list is a flat newest-first feed with no way
   to narrow by crop, disease, severity, or status.
3. **Plain presentation.** No date grouping, minimal header, no at-a-glance
   summary.

## Decisions

1. **Swap the Alerts tab for a Reports tab; move Alerts to a Home bell.**
   (Chosen over adding a 5th tab, which crowds the FAB-split bar.) The tab bar
   stays at 4 routes — `[Home, Map] [FAB] [Reports, Profile]` — preserving the
   center-FAB split layout. Notifications move to a bell icon in the Home
   top-right with the existing unread badge.
2. **Client-side filtering over already-loaded pages.** (Chosen over backend
   query params.) No backend or Prisma changes. Filters/search operate on the
   reports already pulled in via infinite scroll. Self-corrects as the user
   scrolls and more pages load.
3. **Date grouping + redesign reusing existing patterns.** Reuse the
   `groupByDay` / `DayLabel` pattern from the Alerts screen and the chip-filter
   pattern from `NotificationFilter`, rather than introducing new primitives.
4. **Keep `ScrollView`, not FlashList.** Lower risk; matches the Alerts screen.
   The existing manual near-bottom infinite-scroll trigger is retained.

## Design

### 1. Navigation — swap Alerts ⇄ Reports

The custom `TabBar` (`components/navigation/tab-bar.tsx:82-112`) splits the tab
routes around a standalone center FAB. We keep exactly 4 routes so that layout
is untouched.

- **Reports becomes a tab.** Move `app/reports/index.tsx` →
  `app/(app)/reports.tsx`. The route path stays `/reports`, so every existing
  navigation target keeps working: the dashboard "View all" link, the
  empty-state "Scan a crop" CTA, and any `router.push('/reports')`. Remove the
  `BackButton`/back row (tab screens don't pop) and give it a tab-style header.
- **Detail screen unchanged.** `app/reports/[id].tsx` stays a root-stack route
  with `slide_from_bottom`.
- **Alerts becomes a pushed route.** Move `app/(app)/notifications.tsx` →
  `app/notifications.tsx`. Register it in the root `Stack`
  (`app/_layout.tsx`) with `animation: 'slide_from_bottom'`, mirroring the
  existing `reports/[id]` and `report` routes. Add a `BackButton` to its header
  row.
- **Tabs layout** (`app/(app)/_layout.tsx`): remove the `notifications`
  `Tabs.Screen`, add a `reports` one. Final order: `index`, `map`, `reports`,
  `profile`.
- **Tab bar wiring:**
  - `tab-bar-icon.tsx`: add a `reports` icon (lucide `ClipboardList`); the
    `bell` icon entry can remain (still used by the badge component elsewhere)
    but is no longer mapped to a tab.
  - `tab-bar.tsx`: update `ROUTE_TO_ICON` / `ROUTE_TO_LABEL` — replace the
    `notifications: 'bell' / 'Alerts'` entries with `reports: 'reports' /
    'Reports'`. Remove the now-dead `useUnreadCount()` + `NotificationBadge`
    badge branch from the tab bar (the badge moves to Home).

### 2. Alerts bell on Home

- `GreetingHeader` (`features/dashboard/components/greeting-header.tsx`) gains
  optional `unreadCount?: number` and `onPressBell?: () => void` props. Render a
  bell `IconButton` immediately left of the existing avatar, with
  `NotificationBadge` (size `sm`) overlaid top-right when `unreadCount > 0`.
- `(app)/index.tsx` calls `useUnreadCount()` and passes
  `onPressBell={() => router.push('/notifications')}` plus the count into
  `GreetingHeader`.

### 3. Reports page — enhance + redesign

`app/(app)/reports.tsx` (the moved screen):

- **Header.** Large "Reports" title + subtitle, plus a compact summary strip:
  total submitted (`reports.length` + `hasNextPage ? '+'`) and a high-severity
  count derived from loaded items.
- **Filter bar** — new `features/disease-analysis/components/report-filter-bar.tsx`:
  - Search `TextInput` matching crop type and disease/title
    (`advisory?.primaryDiagnosis.displayName ?? disease`), case-insensitive.
  - Severity chips: All / Low / Medium / High.
  - Status chips: All / Analyzed (`SUCCESS`) / Processing (`PENDING|PROCESSING`)
    / Failed (`FAILED`).
  - Built on the existing `Chip` primitive, following the `NotificationFilter`
    chip-row pattern.
- **Filtering logic** — applied client-side to the flattened `reports` array
  via `useMemo` before grouping. A title/crop matcher mirrors the title
  resolution already in `ReportHistoryCard`.
- **Date grouping** — group the filtered list by day on
  `processedAt ?? createdAt`. Reuse `groupByDay` + `DayLabel` (currently under
  `features/notifications/`). Render day headers with grouped `ReportHistoryCard`
  rows, keeping the staggered `FadeInDown` entrance.
- **Empty states:**
  - No reports at all → existing `EmptyState` ("No reports yet" → Scan a crop).
  - Reports exist but filters match none → a distinct "No matches" empty state
    with a "Clear filters" action.
- **Cards** — `ReportHistoryCard` keeps its structure; light polish only.

## Components & files touched

**Moved**
- `app/reports/index.tsx` → `app/(app)/reports.tsx`
- `app/(app)/notifications.tsx` → `app/notifications.tsx`

**Modified**
- `app/_layout.tsx` — register `notifications` root route
- `app/(app)/_layout.tsx` — tab set: drop notifications, add reports
- `components/navigation/tab-bar.tsx` — route→icon/label maps, drop badge branch
- `components/navigation/tab-bar-icon.tsx` — add `reports` icon
- `features/dashboard/components/greeting-header.tsx` — bell + badge
- `app/(app)/index.tsx` — wire unread count + bell press

**New**
- `features/disease-analysis/components/report-filter-bar.tsx`

**Reused (no change)**
- `useMyReports()`, `reportsApi.list`, `ReportHistoryCard`, `Chip`,
  `EmptyState`, `groupByDay` / `DayLabel`, `NotificationBadge`,
  `useUnreadCount`.

## Risks & constraints

- **Client-side filter scope.** Filters only see reports already loaded via
  infinite scroll; unloaded pages aren't searched until scrolled into. Accepted
  for now; backend filter params are the future "complete" version.
- **Auth gating.** Moving Alerts to a root route drops it out of the `(app)`
  onboarding/auth redirect — identical to the existing `reports/[id]` route, and
  it's only reachable from the (authenticated) Home bell. Consistent with
  current behavior.
- **Expo SDK 56.** Per `apps/mobile/AGENTS.md`, verify route-group + root-Stack
  registration and `expo-router` behavior against
  `https://docs.expo.dev/versions/v56.0.0/` during implementation.
- **`groupByDay` location.** It currently lives under `features/notifications/`.
  Import it as-is for now (cross-feature import) rather than relocating, to keep
  the change focused; note as a candidate for promotion to `utils/` later.

## Out of scope

- Making the Profile "Reports" stat tile pressable (easy follow-up; not part of
  this change unless requested).
- Backend filter/search query params.
- Swapping the list to FlashList.
