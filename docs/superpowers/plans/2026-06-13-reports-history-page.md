# Reports History Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing reports history screen a first-class tab with client-side filter/search and date grouping, move Alerts to a Home bell, and redesign the page.

**Architecture:** Keep the working `useMyReports()` data layer untouched. Swap the Alerts tab for a Reports tab (tab count stays 4, FAB-split preserved). Move notifications to a root-stack pushed route reachable from a bell in the Home header. Add pure filter + group-by-day utilities (TDD), a chip-based filter bar, and grouped rendering on the reports screen.

**Tech Stack:** Expo Router 56, React Native 0.85, React 19, TanStack Query 5, NativeWind v5, reanimated, lucide-react-native, Jest.

> **Expo SDK 56 note:** Per `apps/mobile/AGENTS.md`, consult `https://docs.expo.dev/versions/v56.0.0/` before changing routing. All commands run from `apps/mobile`.

---

### Task 1: Report date-grouping utility

`groupByDay` in `features/notifications/utils/group-by-day.ts` is typed for
`Notification[]` and cannot be reused for `Report`. Create a report-specific
version following the same Today/Yesterday/This week/Earlier pattern, grouping on
`processedAt ?? createdAt`.

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/utils/group-reports-by-day.ts`
- Test: `apps/mobile/src/features/disease-analysis/utils/group-reports-by-day.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// group-reports-by-day.test.ts
import type { Report } from '@/features/upload-report/types';
import { groupReportsByDay } from './group-reports-by-day';

function makeReport(id: string, isoDate: string): Report {
  return {
    id,
    userId: 'u1',
    cropType: 'Tomato',
    imageUrl: '',
    imagePublicId: '',
    notes: null,
    latitude: 0,
    longitude: 0,
    disease: null,
    confidence: null,
    severity: null,
    recommendations: [],
    advisory: null,
    processingStatus: 'SUCCESS',
    aiError: null,
    processedAt: isoDate,
    createdAt: isoDate,
    updatedAt: isoDate,
  };
}

describe('groupReportsByDay', () => {
  it('buckets reports into today / earlier and drops empty buckets', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const groups = groupReportsByDay([
      makeReport('a', now.toISOString()),
      makeReport('b', old.toISOString()),
    ]);
    expect(groups.map((g) => g.bucket)).toEqual(['today', 'earlier']);
    expect(groups[0].items.map((r) => r.id)).toEqual(['a']);
    expect(groups[1].items.map((r) => r.id)).toEqual(['b']);
  });

  it('falls back to createdAt when processedAt is null', () => {
    const now = new Date().toISOString();
    const r = { ...makeReport('c', now), processedAt: null };
    const groups = groupReportsByDay([r]);
    expect(groups[0].bucket).toBe('today');
  });

  it('returns [] for an empty list', () => {
    expect(groupReportsByDay([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test group-reports-by-day`
Expected: FAIL — cannot find module `./group-reports-by-day`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// group-reports-by-day.ts
import type { Report } from '@/features/upload-report/types';

export type DayBucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

export interface ReportGroup {
  bucket: DayBucket;
  label: string;
  items: Report[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function timestampOf(report: Report): number {
  return new Date(report.processedAt ?? report.createdAt).getTime();
}

function bucketOf(ts: number): DayBucket {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  if (ts >= todayStart) return 'today';
  if (ts >= todayStart - DAY_MS) return 'yesterday';
  if (ts >= now - 7 * DAY_MS) return 'this-week';
  return 'earlier';
}

const LABELS: Record<DayBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  earlier: 'Earlier',
};

const ORDER: DayBucket[] = ['today', 'yesterday', 'this-week', 'earlier'];

/**
 * Bucket reports into Today / Yesterday / This week / Earlier on
 * `processedAt ?? createdAt`, so the history reads as a timeline. Empty
 * buckets are dropped. Mirrors notifications' groupByDay pattern.
 */
export function groupReportsByDay(reports: Report[]): ReportGroup[] {
  const map: Record<DayBucket, Report[]> = {
    today: [],
    yesterday: [],
    'this-week': [],
    earlier: [],
  };
  for (const report of reports) {
    map[bucketOf(timestampOf(report))].push(report);
  }
  return ORDER.filter((b) => map[b].length > 0).map((b) => ({
    bucket: b,
    label: LABELS[b],
    items: map[b],
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test group-reports-by-day`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/utils/group-reports-by-day.ts apps/mobile/src/features/disease-analysis/utils/group-reports-by-day.test.ts
git commit -m "feat(reports): add report date-grouping utility"
```

---

### Task 2: Report filtering utility

A pure function that filters a flat report list by search text, severity, and
status. The title matcher mirrors `ReportHistoryCard`:
`advisory?.primaryDiagnosis.displayName ?? disease`.

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/utils/filter-reports.ts`
- Test: `apps/mobile/src/features/disease-analysis/utils/filter-reports.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// filter-reports.test.ts
import type { Report, Severity } from '@/features/upload-report/types';
import { filterReports, type ReportFilter } from './filter-reports';

function makeReport(overrides: Partial<Report>): Report {
  return {
    id: 'x',
    userId: 'u1',
    cropType: 'Tomato',
    imageUrl: '',
    imagePublicId: '',
    notes: null,
    latitude: 0,
    longitude: 0,
    disease: 'Early blight',
    confidence: 0.9,
    severity: 'HIGH' as Severity,
    recommendations: [],
    advisory: null,
    processingStatus: 'SUCCESS',
    aiError: null,
    processedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const ALL: ReportFilter = { search: '', severity: 'all', status: 'all' };

describe('filterReports', () => {
  const tomato = makeReport({ id: 'a', cropType: 'Tomato', disease: 'Early blight', severity: 'HIGH' });
  const potato = makeReport({ id: 'b', cropType: 'Potato', disease: 'Late blight', severity: 'LOW', processingStatus: 'SUCCESS' });
  const pending = makeReport({ id: 'c', cropType: 'Wheat', disease: null, severity: null, processingStatus: 'PENDING' });
  const list = [tomato, potato, pending];

  it('returns all reports for the default filter', () => {
    expect(filterReports(list, ALL).map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });

  it('matches search against crop type (case-insensitive)', () => {
    expect(filterReports(list, { ...ALL, search: 'pot' }).map((r) => r.id)).toEqual(['b']);
  });

  it('matches search against disease/title', () => {
    expect(filterReports(list, { ...ALL, search: 'early' }).map((r) => r.id)).toEqual(['a']);
  });

  it('filters by severity', () => {
    expect(filterReports(list, { ...ALL, severity: 'LOW' }).map((r) => r.id)).toEqual(['b']);
  });

  it('filters by status (processing groups PENDING + PROCESSING)', () => {
    expect(filterReports(list, { ...ALL, status: 'processing' }).map((r) => r.id)).toEqual(['c']);
  });

  it('combines search + severity', () => {
    expect(filterReports(list, { ...ALL, search: 'blight', severity: 'HIGH' }).map((r) => r.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter mobile test filter-reports`
Expected: FAIL — cannot find module `./filter-reports`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// filter-reports.ts
import type { Report, Severity } from '@/features/upload-report/types';

export type SeverityFilter = 'all' | Severity;
export type StatusFilter = 'all' | 'analyzed' | 'processing' | 'failed';

export interface ReportFilter {
  search: string;
  severity: SeverityFilter;
  status: StatusFilter;
}

export const DEFAULT_REPORT_FILTER: ReportFilter = {
  search: '',
  severity: 'all',
  status: 'all',
};

/** Same title resolution as ReportHistoryCard. */
function reportTitle(report: Report): string {
  return report.advisory?.primaryDiagnosis.displayName ?? report.disease ?? '';
}

function matchesStatus(report: Report, status: StatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'analyzed':
      return report.processingStatus === 'SUCCESS';
    case 'processing':
      return (
        report.processingStatus === 'PENDING' ||
        report.processingStatus === 'PROCESSING'
      );
    case 'failed':
      return report.processingStatus === 'FAILED';
  }
}

/**
 * Client-side filter over already-loaded reports. Search matches crop type and
 * disease/title (case-insensitive); severity and status narrow the list.
 */
export function filterReports(reports: Report[], filter: ReportFilter): Report[] {
  const q = filter.search.trim().toLowerCase();
  return reports.filter((report) => {
    if (q) {
      const haystack = `${report.cropType} ${reportTitle(report)}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter.severity !== 'all' && report.severity !== filter.severity) return false;
    if (!matchesStatus(report, filter.status)) return false;
    return true;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter mobile test filter-reports`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/utils/filter-reports.ts apps/mobile/src/features/disease-analysis/utils/filter-reports.test.ts
git commit -m "feat(reports): add client-side report filtering utility"
```

---

### Task 3: ReportFilterBar component

Chip-row + search input bound to the `ReportFilter` shape. Uses the existing
`Chip` primitive (active state shows the brand gradient) and the styled
`Text`/`View` from `@/tw`.

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/components/report-filter-bar.tsx`

- [ ] **Step 1: Implement the component**

```tsx
// report-filter-bar.tsx
import { Search, X } from 'lucide-react-native';
import { ScrollView, TextInput } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import type {
  ReportFilter,
  SeverityFilter,
  StatusFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { palette } from '@/theme/colors';
import { View } from '@/tw';

interface ReportFilterBarProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
}

const SEVERITY_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'analyzed', label: 'Analyzed' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
];

/**
 * Search + severity + status filters for the reports history screen. Purely
 * controlled — owns no state. Filtering itself happens client-side in the
 * screen via filterReports().
 */
export function ReportFilterBar({ value, onChange }: ReportFilterBarProps) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <Search size={16} color={palette.brand[400]} strokeWidth={2.2} />
        <TextInput
          value={value.search}
          onChangeText={(search) => onChange({ ...value, search })}
          placeholder="Search crop or disease"
          placeholderTextColor={palette.neutral?.[400] ?? '#9ca3af'}
          style={{ flex: 1, fontSize: 14, color: palette.neutral?.[900] ?? '#111827', padding: 0 }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.search.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChange({ ...value, search: '' })}
            pressedScale={0.9}
            haptic="selection"
          >
            <X size={16} color={palette.brand[400]} strokeWidth={2.2} />
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <Chip
            key={`sev-${opt.key}`}
            label={opt.label}
            active={value.severity === opt.key}
            tone="brand"
            onPress={() => onChange({ ...value, severity: opt.key })}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={`status-${opt.key}`}
            label={opt.label}
            active={value.status === opt.key}
            tone="neutral"
            onPress={() => onChange({ ...value, status: opt.key })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
```

> **Note:** Verify `palette.neutral` exists in `theme/colors.ts`. If the palette
> uses different keys, substitute the nearest muted/text color when implementing
> (the `?? '#...'` fallbacks keep it safe regardless).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS (no errors referencing `report-filter-bar.tsx`).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/components/report-filter-bar.tsx
git commit -m "feat(reports): add report filter bar component"
```

---

### Task 4: Move + redesign the reports screen as a tab

Move `app/reports/index.tsx` → `app/(app)/reports.tsx`. Drop the back row (tab
screens don't pop), add the filter bar, group filtered results by day, and add a
"no matches" empty state.

**Files:**
- Create: `apps/mobile/src/app/(app)/reports.tsx`
- Delete: `apps/mobile/src/app/reports/index.tsx`

- [ ] **Step 1: Create the new tab screen**

```tsx
// app/(app)/reports.tsx
import { router } from 'expo-router';
import { Leaf, SearchX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { Skeleton } from '@/components/ui/skeleton';
import { DayLabel } from '@/features/notifications/components';
import { ReportFilterBar } from '@/features/disease-analysis/components/report-filter-bar';
import { ReportHistoryCard } from '@/features/disease-analysis/components/report-history-card';
import { useMyReports } from '@/features/disease-analysis/hooks/use-my-reports';
import {
  DEFAULT_REPORT_FILTER,
  filterReports,
  type ReportFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { groupReportsByDay } from '@/features/disease-analysis/utils/group-reports-by-day';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

const NEAR_BOTTOM_PX = 240;

/**
 * "Reports" — the full history of the signed-in user's reports, now a primary
 * tab. Client-side search + severity/status filters over loaded pages, grouped
 * by day. Infinite-scrolls, pull-to-refresh, explicit loading/empty/error.
 */
export default function ReportsScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState<ReportFilter>(DEFAULT_REPORT_FILTER);
  const {
    data,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMyReports();

  const reports = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const filtered = useMemo(() => filterReports(reports, filter), [reports, filter]);
  const groups = useMemo(() => groupReportsByDay(filtered), [filtered]);
  const highSeverityCount = useMemo(
    () => reports.filter((r) => r.severity === 'HIGH').length,
    [reports],
  );
  const isFiltering =
    filter.search.trim().length > 0 || filter.severity !== 'all' || filter.status !== 'all';

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View className="gap-3 px-4 pb-2 pt-2">
          <View>
            <Text className="text-3xl font-extrabold tracking-tight text-text">Reports</Text>
            <Text className="text-sm text-text-muted">
              {reports.length > 0
                ? `${reports.length}${hasNextPage ? '+' : ''} submitted · ${highSeverityCount} high severity`
                : 'Your crop scans show up here'}
            </Text>
          </View>
          {reports.length > 0 ? <ReportFilterBar value={filter} onChange={setFilter} /> : null}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const distanceFromBottom =
              contentSize.height - (contentOffset.y + layoutMeasurement.height);
            if (distanceFromBottom < NEAR_BOTTOM_PX && hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          scrollEventThrottle={120}
        >
          {isPending ? (
            <View className="gap-2.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={80} rounded="xl" />
              ))}
            </View>
          ) : isError ? (
            <View className="items-center gap-3 py-16">
              <Text className="text-base font-bold text-text">Couldn&apos;t load your reports</Text>
              <Text className="max-w-[260px] text-center text-sm text-text-muted">
                Check your connection and try again.
              </Text>
              <Button label="Retry" variant="ghost" onPress={() => refetch()} fullWidth={false} />
            </View>
          ) : reports.length === 0 ? (
            <EmptyState
              icon={<Leaf size={28} color={palette.brand[600]} strokeWidth={2} />}
              title="No reports yet"
              description="Scan your first crop to start tracking diseases. Your reports show up here."
              actionLabel="Scan a crop"
              onAction={() => router.push('/report')}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<SearchX size={28} color={palette.brand[600]} strokeWidth={2} />}
              title="No matching reports"
              description="No reports match your current filters. Try clearing them."
              actionLabel="Clear filters"
              onAction={() => setFilter(DEFAULT_REPORT_FILTER)}
            />
          ) : (
            <>
              {groups.map((group, gi) => (
                <View key={group.bucket}>
                  <DayLabel>{group.label}</DayLabel>
                  <View className="gap-2.5">
                    {group.items.map((report, i) => (
                      <Animated.View
                        key={report.id}
                        entering={FadeInDown.delay(Math.min(gi * 60 + i * 40, 360)).duration(360)}
                      >
                        <ReportHistoryCard report={report} />
                      </Animated.View>
                    ))}
                  </View>
                </View>
              ))}
              {!isFiltering && isFetchingNextPage ? (
                <View className="py-4">
                  <Loader size={28} />
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
```

> **Verify before writing:** confirm `DayLabel` is exported from
> `@/features/notifications/components` (it is imported that way in
> `(app)/notifications.tsx`). Confirm `EmptyState` accepts an `icon` prop (the
> old reports screen used it). If `SearchX` isn't in lucide's exports for this
> version, substitute `FilterX` or `Search`.

- [ ] **Step 2: Delete the old screen**

```bash
git rm apps/mobile/src/app/reports/index.tsx
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS. (Tab registration happens in Task 6 — a transient "no route" is fine until then, but types must be clean.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/app/(app)/reports.tsx
git commit -m "feat(reports): move reports history into a tab with filters and day grouping"
```

---

### Task 5: Move Alerts to a root-stack route

Move `app/(app)/notifications.tsx` → `app/notifications.tsx`, add a back row,
and register it in the root `Stack` with `slide_from_bottom`.

**Files:**
- Create: `apps/mobile/src/app/notifications.tsx`
- Delete: `apps/mobile/src/app/(app)/notifications.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx`

- [ ] **Step 1: Create the root route**

Copy the entire current contents of `app/(app)/notifications.tsx` into
`app/notifications.tsx`, then add a back row at the top of the header block.

Add this import alongside the others:

```tsx
import { BackButton } from '@/components/ui/back-button';
```

Change the header `<View className="px-4 pt-2">` opening block so the title row
is preceded by a back button. Replace:

```tsx
        <View className="px-4 pt-2">
          <View className="flex-row items-end justify-between gap-3">
```

with:

```tsx
        <View className="px-4 pt-2">
          <View className="mb-2 flex-row items-center gap-3">
            <BackButton onPress={() => router.back()} />
          </View>
          <View className="flex-row items-end justify-between gap-3">
```

(All other logic — filters, queries, list — stays identical.)

- [ ] **Step 2: Delete the old tab screen**

```bash
git rm apps/mobile/src/app/(app)/notifications.tsx
```

- [ ] **Step 3: Register the route in the root Stack**

Modify `apps/mobile/src/app/_layout.tsx`. After the existing `report`
`Stack.Screen` (around line 133-136), add:

```tsx
        <Stack.Screen
          name="notifications"
          options={{ animation: 'slide_from_bottom' }}
        />
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/notifications.tsx apps/mobile/src/app/_layout.tsx
git commit -m "feat(notifications): move alerts to a pushed root route"
```

---

### Task 6: Swap the tab — Reports in, Alerts out

**Files:**
- Modify: `apps/mobile/src/components/navigation/tab-bar-icon.tsx`
- Modify: `apps/mobile/src/components/navigation/tab-bar.tsx`
- Modify: `apps/mobile/src/app/(app)/_layout.tsx`

- [ ] **Step 1: Add the reports icon**

In `tab-bar-icon.tsx`, add `ClipboardList` to the lucide import, extend the
type, and register it:

```tsx
import { Bell, ClipboardList, House, Map, Plus, User } from 'lucide-react-native';

export type TabIconName = 'house' | 'map' | 'plus' | 'bell' | 'user' | 'reports';
```

```tsx
const ICONS: Record<TabIconName, typeof House> = {
  house: House,
  map: Map,
  plus: Plus,
  bell: Bell,
  user: User,
  reports: ClipboardList,
};
```

- [ ] **Step 2: Update the tab bar route maps and drop the badge**

In `tab-bar.tsx`, change the maps (lines 19-31):

```tsx
const ROUTE_TO_ICON: Record<string, TabIconName> = {
  index: 'house',
  map: 'map',
  reports: 'reports',
  profile: 'user',
};

const ROUTE_TO_LABEL: Record<string, string> = {
  index: 'Home',
  map: 'Map',
  reports: 'Reports',
  profile: 'Profile',
};
```

Remove the unread badge wiring (no longer needed in the tab bar):
- Delete the import line `import { NotificationBadge } from '@/features/notifications/components/notification-badge';`
- Delete the import line `import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';`
- Delete `const unreadCount = useUnreadCount();` inside `TabBar`.
- In `renderTab`, replace the `badge={...}` prop value with `badge={null}`.

- [ ] **Step 3: Update the tab set**

In `app/(app)/_layout.tsx`, replace the notifications screen with reports (keep
order index, map, reports, profile):

```tsx
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="map" options={{ title: 'Map' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
```

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.
Run: `pnpm --filter mobile lint`
Expected: PASS, or only pre-existing warnings unrelated to these files.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/navigation/tab-bar-icon.tsx apps/mobile/src/components/navigation/tab-bar.tsx apps/mobile/src/app/(app)/_layout.tsx
git commit -m "feat(nav): replace alerts tab with reports tab"
```

---

### Task 7: Add the Alerts bell to the Home header

**Files:**
- Modify: `apps/mobile/src/features/dashboard/components/greeting-header.tsx`
- Modify: `apps/mobile/src/app/(app)/index.tsx`

- [ ] **Step 1: Add bell + badge to GreetingHeader**

Modify `greeting-header.tsx`. Update imports and props, and add the bell button
left of the avatar.

Add imports:

```tsx
import { Bell } from 'lucide-react-native';

import { NotificationBadge } from '@/features/notifications/components/notification-badge';
import { palette } from '@/theme/colors';
```

Update the props interface:

```tsx
interface GreetingHeaderProps {
  user: User | null;
  unreadCount?: number;
  onPressAvatar?: () => void;
  onPressBell?: () => void;
}
```

Update the signature:

```tsx
export function GreetingHeader({
  user,
  unreadCount = 0,
  onPressAvatar,
  onPressBell,
}: GreetingHeaderProps) {
```

Replace the trailing avatar `PressableScale` block (currently the lone right-side
element) with a row holding the bell and the avatar:

```tsx
        <View className="flex-row items-center gap-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open alerts"
            onPress={onPressBell}
            haptic="selection"
            pressedScale={0.92}
            className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          >
            <Bell size={20} color={palette.brand[700]} strokeWidth={2.2} />
            {unreadCount > 0 ? (
              <View style={{ position: 'absolute', top: -2, right: -2 }}>
                <NotificationBadge count={unreadCount} size="sm" />
              </View>
            ) : null}
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={onPressAvatar}
            haptic="selection"
            pressedScale={0.92}
          >
            <Avatar name={user?.name} fallback="🌾" size="md" />
          </PressableScale>
        </View>
```

- [ ] **Step 2: Wire it in the Home screen**

Modify `app/(app)/index.tsx`. Add the hook import and pass the props.

Add import:

```tsx
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
```

Inside `HomeScreen`, add:

```tsx
  const unreadCount = useUnreadCount();
```

Update the `GreetingHeader` usage:

```tsx
            <GreetingHeader
              user={user}
              unreadCount={unreadCount}
              onPressAvatar={() => router.push('/profile')}
              onPressBell={() => router.push('/notifications')}
            />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/dashboard/components/greeting-header.tsx apps/mobile/src/app/(app)/index.tsx
git commit -m "feat(home): surface alerts via header bell with unread badge"
```

---

### Task 8: Full verification

- [ ] **Step 1: Run the full mobile test suite**

Run: `pnpm --filter mobile test`
Expected: PASS, including the two new util test files.

- [ ] **Step 2: Typecheck the whole app**

Run: `pnpm --filter mobile typecheck`
Expected: PASS, no errors.

- [ ] **Step 3: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS, or only pre-existing warnings unrelated to changed files.

- [ ] **Step 4: Manual smoke test (dev server)**

Run: `pnpm --filter mobile start` and verify on a device/emulator:
- Tab bar shows Home, Map, [FAB], Reports, Profile — no Alerts tab.
- Reports tab opens the history; search + severity + status filters narrow the list; clearing filters restores it; day-group headers render; infinite scroll still loads more.
- "No matching reports" empty state appears when filters exclude everything, and "Clear filters" resets.
- Home header shows a bell top-right with the unread badge; tapping it pushes Alerts; Alerts has a working back button.
- Dashboard "View all" still lands on the Reports screen.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(reports): verification cleanup"
```

---

## Notes for the implementer

- **Do not touch** `useMyReports`, `reportsApi`, the backend, or
  `reports/[id].tsx`. The data layer is correct as-is.
- **Client-side filtering only sees loaded pages.** This is intentional for this
  iteration (see the design doc's Risks section).
- **`palette` keys:** verify exact keys in `theme/colors.ts` before relying on
  `palette.neutral`; the filter bar uses safe `??` fallbacks regardless.
- **Cross-feature imports** (`DayLabel`, `NotificationBadge`,
  `useUnreadCount` from `features/notifications`) are intentional reuse; not a
  refactor target for this change.
