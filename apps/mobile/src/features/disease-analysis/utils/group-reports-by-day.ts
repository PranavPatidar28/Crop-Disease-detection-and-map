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
