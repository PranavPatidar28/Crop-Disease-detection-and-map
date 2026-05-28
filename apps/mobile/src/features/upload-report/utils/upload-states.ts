/** UPLOAD pipeline labels per state. Used by progress UI. */
import type { UploadState } from '../types';

export const STATE_LABELS: Record<UploadState, string> = {
  idle: 'Ready',
  compressing: 'Compressing image…',
  uploading: 'Uploading photo…',
  processing: 'Saving report…',
  success: 'Report submitted',
  failed: 'Upload failed',
  'queued-offline': 'Queued for upload',
};

/** Exponential backoff for queue retries. Capped at 6h. */
export function backoffDelayMs(attempts: number): number {
  const minutes = [1, 5, 15, 60, 360]; // 1m, 5m, 15m, 1h, 6h
  const idx = Math.min(attempts, minutes.length - 1);
  return minutes[idx]! * 60_000;
}

export const MAX_QUEUE_ATTEMPTS = 5;
