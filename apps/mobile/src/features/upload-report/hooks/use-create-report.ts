import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useAuthStore } from '@/store/auth.store';

import { cloudinaryApi } from '../api/cloudinary.api';
import { reportsApi } from '../api/reports.api';
import { useOfflineQueueStore } from '../store/offline-queue.store';
import type { PickedImage, Report, ReportDraft, ReportLocation, UploadState } from '../types';
import { compressImage } from '../utils/compress-image';
import { copyToUploadsDir, deleteLocalFile } from '../utils/file-storage';

interface CreateReportInput {
  picked: PickedImage;
  cropTypeId: string;
  cropTypeName: string;
  notes?: string;
  location: ReportLocation;
  /** When true, skip the network and enqueue offline. */
  forceOffline?: boolean;
}

interface UseCreateReportResult {
  state: UploadState;
  progress: number;
  error: string | null;
  result: Report | null;
  submit: (input: CreateReportInput) => Promise<void>;
  reset: () => void;
}

function makeId(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function useCreateReport(): UseCreateReportResult {
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Report | null>(null);

  const queryClient = useQueryClient();
  const enqueue = useOfflineQueueStore((s) => s.enqueue);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  const submit = useCallback(
    async (input: CreateReportInput) => {
      if (!isAuthenticated) {
        setError('Please sign in to upload a report.');
        setState('failed');
        return;
      }

      setError(null);
      setProgress(0);

      // Step 1 — compress
      setState('compressing');
      let compressedUri: string;
      try {
        const compressed = await compressImage(
          input.picked.uri,
          input.picked.width,
          input.picked.height,
        );
        compressedUri = compressed.uri;
      } catch (err) {
        setError((err as Error).message ?? 'Failed to compress image');
        setState('failed');
        return;
      }

      // Persist the compressed file under our own directory so it survives cache eviction.
      const itemId = makeId();
      // Idempotency key reused for the entire lifecycle of this draft so the
      // backend dedupes if we retry from the offline queue.
      const clientId = uuidv4();
      let persistentUri: string;
      try {
        persistentUri = copyToUploadsDir(compressedUri, itemId);
      } catch {
        persistentUri = compressedUri;
      }

      const draft: ReportDraft = {
        cropTypeId: input.cropTypeId,
        cropTypeName: input.cropTypeName,
        notes: input.notes,
        location: input.location,
        localImageUri: persistentUri,
        clientId,
      };

      if (input.forceOffline) {
        await enqueue({
          id: itemId,
          draft,
          status: 'pending',
          attempts: 0,
          createdAt: new Date().toISOString(),
        });
        setState('queued-offline');
        return;
      }

      // Step 2 — upload to Cloudinary
      setState('uploading');
      let uploadResult;
      try {
        const sig = await cloudinaryApi.getSignature();
        uploadResult = await cloudinaryApi.uploadImage(persistentUri, sig, (p) => setProgress(p));
      } catch (err) {
        // Network or Cloudinary failure → enqueue for offline retry
        await enqueue({
          id: itemId,
          draft,
          status: 'pending',
          attempts: 0,
          lastError: (err as Error).message,
          createdAt: new Date().toISOString(),
        });
        setState('queued-offline');
        return;
      }

      // Step 3 — backend report creation
      setState('processing');
      try {
        const created = await reportsApi.create({
          clientId: draft.clientId,
          cropType: draft.cropTypeName,
          imageUrl: uploadResult.secure_url,
          imagePublicId: uploadResult.public_id,
          notes: draft.notes,
          latitude: draft.location.latitude,
          longitude: draft.location.longitude,
        });
        setResult(created);
        setState('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        // Cleanup local copy on success
        deleteLocalFile(persistentUri);
        // Invalidate any list queries that should reflect the new report
        await queryClient.invalidateQueries({ queryKey: ['reports'] });
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        // Seed the detail query so the result screen renders instantly,
        // then navigate. The screen polls until processing finishes.
        queryClient.setQueryData(['reports', created.id], created);
        router.replace({ pathname: '/reports/[id]', params: { id: created.id } });
      } catch (err) {
        // Cloudinary succeeded but our server didn't — enqueue so we can retry
        // the backend call later. clientId guarantees idempotency.
        await enqueue({
          id: itemId,
          draft,
          status: 'pending',
          attempts: 0,
          lastError: (err as Error).message,
          createdAt: new Date().toISOString(),
        });
        setState('queued-offline');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => undefined,
        );
      }
    },
    [enqueue, isAuthenticated, queryClient],
  );

  return { state, progress, error, result, submit, reset };
}

/**
 * Mutation wrapper kept thin — most logic lives in the orchestrator above.
 * Useful when you want react-query's status without the manual state.
 */
export function useCreateReportMutation() {
  return useMutation({
    mutationFn: async (payload: Parameters<typeof reportsApi.create>[0]) => reportsApi.create(payload),
  });
}
