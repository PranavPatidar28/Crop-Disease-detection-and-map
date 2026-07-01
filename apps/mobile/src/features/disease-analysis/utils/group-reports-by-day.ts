import type { Report } from '@/features/upload-report/types';

export type DayBucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

export interface ReportGroup {
  bucket: DayBucket;
  label: string;
  items: Report[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function timestampIsoOf(report: Report): string {
  return report.processedAt ?? report.createdAt;
}

function bucketOf(tsIso: string, thresholds: { today: string; yesterday: string; thisWeek: string }): DayBucket {
  if (tsIso >= thresholds.today) return 'today';
  if (tsIso >= thresholds.yesterday) return 'yesterday';
  if (tsIso >= thresholds.thisWeek) return 'this-week';
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

  const now = Date.now();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStart = todayDate.getTime();

  const thresholds = {
    today: new Date(todayStart).toISOString(),
    yesterday: new Date(todayStart - DAY_MS).toISOString(),
    thisWeek: new Date(now - 7 * DAY_MS).toISOString(),
  };

  for (const report of reports) {
    map[bucketOf(timestampIsoOf(report), thresholds)].push(report);
  }
  return ORDER.filter((b) => map[b].length > 0).map((b) => ({
    bucket: b,
    label: LABELS[b],
    items: map[b],
  }));
}
