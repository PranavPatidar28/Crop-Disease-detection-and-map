import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSyncStatusStore } from '@/features/offline-sync/store/sync-status.store';

import { cloudinaryApi } from '../api/cloudinary.api';
import { reportsApi } from '../api/reports.api';
import { useOfflineQueueStore } from '../store/offline-queue.store';
import type { QueueItem } from '../types';
import { deleteLocalFile } from '../utils/file-storage';
import { backoffDelayMs, MAX_QUEUE_ATTEMPTS } from '../utils/upload-states';

/**
 * Drains the offline queue:
 * - listens to NetInfo
 * - when online, walks pending items and tries to upload them
 * - exponential backoff on failure, capped at MAX_QUEUE_ATTEMPTS
 * - reports phase + queue depth to the sync status store for UI surfaces
 */
export function useOfflineQueue(enabled: boolean): void {
  const items = useOfflineQueueStore((s) => s.items);
  const isHydrated = useOfflineQueueStore((s) => s.isHydrated);
  const update = useOfflineQueueStore((s) => s.update);
  const remove = useOfflineQueueStore((s) => s.remove);
  const queryClient = useQueryClient();

  const setPhase = useSyncStatusStore((s) => s.setPhase);
  const setQueueDepth = useSyncStatusStore((s) => s.setQueueDepth);
  const markSynced = useSyncStatusStore((s) => s.markSynced);
  const setError = useSyncStatusStore((s) => s.setError);

  const drainingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror queue depth into sync-status so badges / banners can read one place.
  useEffect(() => {
    setQueueDepth(items.length);
  }, [items.length, setQueueDepth]);

  useEffect(() => {
    if (!enabled || !isHydrated) return;

    let cancelled = false;

    // Schedules a re-drain at the soonest backed-off item's nextAttemptAt.
    // Without this, a backed-off item only wakes on an enqueue or a reconnect,
    // so the exponential schedule stalls while the app stays open and online.
    const scheduleNextRetry = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const now = Date.now();
      const waiting = useOfflineQueueStore
        .getState()
        .items.filter(
          (i) =>
            i.status !== 'failed' &&
            i.nextAttemptAt != null &&
            i.nextAttemptAt > now,
        );
      if (waiting.length === 0) return;
      const soonest = Math.min(...waiting.map((i) => i.nextAttemptAt as number));
      const delay = Math.max(0, soonest - now);
      retryTimerRef.current = setTimeout(() => {
        if (!cancelled) void drain();
      }, delay);
    };

    const drain = async () => {
      if (drainingRef.current) return;
      drainingRef.current = true;
      let anySucceeded = false;
      let anyFailed = false;
      let lastError: string | null = null;
      try {
        const net = await NetInfo.fetch();
        if (!net.isConnected) return;

        const snapshot = useOfflineQueueStore.getState().items;
        const drainable = snapshot.filter(
          (i) =>
            !(i.status === 'failed' && i.attempts >= MAX_QUEUE_ATTEMPTS) &&
            !(i.nextAttemptAt && i.nextAttemptAt > Date.now()),
        );
        if (drainable.length > 0) setPhase('syncing');

        for (const item of drainable) {
          if (cancelled) break;
          const result = await processItem(item, update, remove, queryClient);
          if (result.ok) anySucceeded = true;
          else {
            anyFailed = true;
            lastError = result.error;
          }
        }
      } finally {
        drainingRef.current = false;
        if (anySucceeded && !anyFailed) markSynced();
        else if (anyFailed) setError(lastError ?? 'Sync failed');
        else setPhase('idle');
        // Re-arm the wake-up timer for any items still cooling down.
        if (!cancelled) scheduleNextRetry();
      }
    };

    void drain();
    const sub = NetInfo.addEventListener((state) => {
      if (state.isConnected) void drain();
    });

    return () => {
      cancelled = true;
      sub();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isHydrated, items.length]);
}

async function processItem(
  item: QueueItem,
  update: (id: string, patch: Partial<QueueItem>) => Promise<void>,
  remove: (id: string) => Promise<void>,
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await update(item.id, { status: 'uploading' });

  try {
    // Reuse a previously-uploaded asset if a prior attempt got past Cloudinary
    // but failed on the server POST. Otherwise each retry would upload a brand-
    // new copy, leaking up to MAX_QUEUE_ATTEMPTS orphaned assets per item.
    let imageUrl = item.uploadedImageUrl;
    let imagePublicId = item.uploadedPublicId;

    if (!imageUrl || !imagePublicId) {
      const sig = await cloudinaryApi.getSignature();
      const uploaded = await cloudinaryApi.uploadImage(item.draft.localImageUri, sig);
      imageUrl = uploaded.secure_url;
      imagePublicId = uploaded.public_id;
      // Persist immediately so a server-POST failure below doesn't re-upload.
      await update(item.id, {
        uploadedImageUrl: imageUrl,
        uploadedPublicId: imagePublicId,
      });
    }

    await reportsApi.create({
      clientId: item.draft.clientId,
      cropType: item.draft.cropTypeName,
      imageUrl,
      imagePublicId,
      notes: item.draft.notes,
      latitude: item.draft.location.latitude,
      longitude: item.draft.location.longitude,
      // Provisional on-device/manual diagnosis captured while offline. The
      // backend stores it and re-runs HF to upgrade (engine !== 'cloud').
      disease: item.draft.diagnosis?.disease,
      confidence: item.draft.diagnosis?.confidence,
      severity: item.draft.diagnosis?.severity,
      advisory: item.draft.diagnosis?.advisory,
      engine: item.draft.diagnosis?.engine,
    });

    deleteLocalFile(item.draft.localImageUri);
    await remove(item.id);
    await queryClient.invalidateQueries({ queryKey: ['reports'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    return { ok: true };
  } catch (err) {
    const attempts = item.attempts + 1;
    const reachedCap = attempts >= MAX_QUEUE_ATTEMPTS;
    const error = (err as Error).message ?? 'Unknown error';
    // Once an item is permanently failed it will never drain again, so free its
    // persistent local copy now rather than leaking it in documentDirectory.
    if (reachedCap) deleteLocalFile(item.draft.localImageUri);
    await update(item.id, {
      status: reachedCap ? 'failed' : 'pending',
      attempts,
      lastError: error,
      nextAttemptAt: reachedCap ? undefined : Date.now() + backoffDelayMs(attempts),
    });
    return { ok: false, error };
  }
}
