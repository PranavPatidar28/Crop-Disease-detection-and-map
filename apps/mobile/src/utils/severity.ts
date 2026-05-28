/**
 * Maps a Severity token to theme tokens, label, and a tailwind tint suffix.
 * Keep all severity ↔ visual decisions here so screens stay declarative.
 *
 * Accepts both lowercase (mock dashboard) and uppercase (backend Prisma enum)
 * forms so callers don't have to normalize.
 */
import type { Severity } from '@/features/dashboard/types';
import { palette } from '@/theme/colors';

export interface SeverityVisuals {
  label: string;
  textClass: string;
  bgClass: string; // tinted background for badges
  ringClass: string;
  rawColor: string;
}

export function severityVisuals(severity: Severity | 'LOW' | 'MEDIUM' | 'HIGH' | null | undefined): SeverityVisuals {
  const norm = (severity ?? 'low').toString().toLowerCase();
  switch (norm) {
    case 'high':
      return {
        label: 'High',
        textClass: 'text-danger',
        bgClass: 'bg-danger/15',
        ringClass: 'border-danger/30',
        rawColor: '#ef4444',
      };
    case 'medium':
      return {
        label: 'Medium',
        textClass: 'text-warning',
        bgClass: 'bg-warning/15',
        ringClass: 'border-warning/30',
        rawColor: '#f59e0b',
      };
    default:
      return {
        label: 'Low',
        textClass: 'text-success',
        bgClass: 'bg-success/15',
        ringClass: 'border-success/30',
        rawColor: palette.brand[500],
      };
  }
}

/** Quick "2h ago" formatter, locale-free. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
