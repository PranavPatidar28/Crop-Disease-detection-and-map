import type { Report } from '@/features/upload-report/types';

export type DayBucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

export interface ReportGroup {
  bucket: DayBucket;
  label: string;
  items: Report[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const todayIso = new Date(todayStart).toISOString();
  const yesterdayIso = new Date(todayStart - DAY_MS).toISOString();
  const thisWeekIso = new Date(now - 7 * DAY_MS).toISOString();

  for (const report of reports) {
    const tsIso = report.processedAt ?? report.createdAt;

    let bucket: DayBucket;
    if (tsIso >= todayIso) bucket = 'today';
    else if (tsIso >= yesterdayIso) bucket = 'yesterday';
    else if (tsIso >= thisWeekIso) bucket = 'this-week';
    else bucket = 'earlier';

    map[bucket].push(report);
  }

  return ORDER.filter((b) => map[b].length > 0).map((b) => ({
    bucket: b,
    label: LABELS[b],
    items: map[b],
  }));
}
