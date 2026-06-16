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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const todayIso = new Date(todayStart).toISOString();
  const yesterdayIso = new Date(todayStart - DAY_MS).toISOString();
  const thisWeekIso = new Date(Date.now() - 7 * DAY_MS).toISOString();

  const map: Record<DayBucket, Notification[]> = {
    today: [],
    yesterday: [],
    'this-week': [],
    earlier: [],
  };

  for (const item of items) {
    const createdAt = item.createdAt;
    if (createdAt >= todayIso) {
      map['today'].push(item);
    } else if (createdAt >= yesterdayIso) {
      map['yesterday'].push(item);
    } else if (createdAt >= thisWeekIso) {
      map['this-week'].push(item);
    } else {
      map['earlier'].push(item);
    }
  }

  return ORDER
    .filter((b) => map[b].length > 0)
    .map((b) => ({ bucket: b, label: LABELS[b], items: map[b] }));
}
