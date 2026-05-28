import type { Notification } from '../api/notifications.api';

export type DayBucket = 'today' | 'yesterday' | 'this-week' | 'earlier';

export interface NotificationGroup {
  bucket: DayBucket;
  label: string;
  items: Notification[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function bucketOf(createdAtIso: string): DayBucket {
  const createdAt = new Date(createdAtIso).getTime();
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  if (createdAt >= todayStart) return 'today';
  if (createdAt >= todayStart - DAY_MS) return 'yesterday';
  if (createdAt >= now - 7 * DAY_MS) return 'this-week';
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
  for (const item of items) {
    map[bucketOf(item.createdAt)].push(item);
  }
  return ORDER
    .filter((b) => map[b].length > 0)
    .map((b) => ({ bucket: b, label: LABELS[b], items: map[b] }));
}
