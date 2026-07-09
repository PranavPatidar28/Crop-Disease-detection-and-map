import type { Notification } from '../api/notifications.api';

export type DayBucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

export interface NotificationGroup {
  bucket: DayBucket;
  label: string;
  items: Notification[];
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
 * Bucket notifications into Today / Yesterday / This week / Earlier so the
 * list reads as a timeline. Empty buckets are dropped.
 */
export function groupByDay(items: Notification[]): NotificationGroup[] {
  const map: Record<DayBucket, Notification[]> = {
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

  for (const item of items) {
    let bucket: DayBucket;
    if (item.createdAt >= todayIso) bucket = 'today';
    else if (item.createdAt >= yesterdayIso) bucket = 'yesterday';
    else if (item.createdAt >= thisWeekIso) bucket = 'this-week';
    else bucket = 'earlier';

    map[bucket].push(item);
  }

  return ORDER
    .filter((b) => map[b].length > 0)
    .map((b) => ({ bucket: b, label: LABELS[b], items: map[b] }));
}
