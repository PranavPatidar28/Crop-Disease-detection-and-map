import { CheckCircle2, CloudOff, Inbox, RefreshCw, TriangleAlert } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import { useNetworkStore } from '../store/network.store';
import { useSyncStatusStore } from '../store/sync-status.store';
import { useOfflineQueueStore } from '@/features/upload-report/store/offline-queue.store';

interface QueueStatusCardProps {
  className?: string;
  onRetryAll?: () => void;
}

/**
 * Surfaces the offline queue's state in a light card. Suitable for the
 * dashboard and upload screens.
 *
 *  - Hidden when there are no queued items AND the most recent sync succeeded.
 *  - Shows queue depth, last error, and per-state counts when applicable.
 *  - Optional "Retry now" action.
 */
export function QueueStatusCard({ className, onRetryAll }: QueueStatusCardProps) {
  const networkState = useNetworkStore((s) => s.state);
  const phase = useSyncStatusStore((s) => s.phase);
  const lastSyncedAt = useSyncStatusStore((s) => s.lastSyncedAt);
  const lastError = useSyncStatusStore((s) => s.lastError);
  const items = useOfflineQueueStore((s) => s.items);

  if (items.length === 0 && phase !== 'failed') return null;

  const pending = items.filter((i) => i.status === 'pending').length;
  const uploading = items.filter((i) => i.status === 'uploading').length;
  const failed = items.filter((i) => i.status === 'failed').length;

  const offline = networkState === 'offline';
  const isFailureState = phase === 'failed' || failed > 0;
  const isSyncing = phase === 'syncing';

  const tileBgClass = offline
    ? 'bg-warning-tint'
    : isFailureState
      ? 'bg-danger-tint'
      : 'bg-brand-50';

  const headlineIcon = offline ? (
    <CloudOff size={18} color={palette.status.warning} strokeWidth={2.2} />
  ) : isFailureState ? (
    <TriangleAlert size={18} color={palette.status.danger} strokeWidth={2.2} />
  ) : isSyncing ? (
    <RefreshCw size={18} color={palette.brand[600]} strokeWidth={2.2} />
  ) : (
    <Inbox size={18} color={palette.brand[600]} strokeWidth={2.2} />
  );

  const headline = offline
    ? `${items.length} ${items.length === 1 ? 'upload' : 'uploads'} waiting`
    : isSyncing
      ? `Syncing ${items.length} ${items.length === 1 ? 'upload' : 'uploads'}`
      : isFailureState
        ? `${items.length} pending · ${failed} need attention`
        : `${items.length} pending sync`;

  const subline = offline
    ? "Saved on this device. We'll send them as soon as you're back online."
    : lastError
      ? lastError
      : `Pending ${pending} · Uploading ${uploading}${failed ? ` · Failed ${failed}` : ''}`;

  // Progress: items completed (i.e. not in items list) vs the original count
  // is unknown here; we show progress as uploading-vs-total when syncing.
  const total = items.length || 1;
  const progressed = uploading + (items.length - pending - uploading - failed);
  const progressFraction = isSyncing ? Math.min(1, Math.max(0, progressed / total)) : 0;

  return (
    <View className={cn(className)}>
      <Card padding="md" className="gap-3">
        <View className="flex-row items-start gap-3">
          <View
            className={cn(
              'mt-0.5 h-9 w-9 items-center justify-center rounded-2xl border border-border',
              tileBgClass,
            )}
          >
            {headlineIcon}
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-text">{headline}</Text>
            <Text className="text-[11px] text-text-muted" numberOfLines={2}>
              {subline}
            </Text>
            {lastSyncedAt && !isFailureState && !offline ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <CheckCircle2 size={11} color={palette.brand[600]} strokeWidth={2.4} />
                <Text className="text-[10px] text-text-subtle">
                  Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {isSyncing ? (
          <View className="h-1.5 overflow-hidden rounded-full bg-border">
            <View
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.round(progressFraction * 100)}%` }}
            />
          </View>
        ) : null}

        {!offline && isFailureState && onRetryAll ? (
          <Button
            label="Retry now"
            variant="ghost"
            size="sm"
            onPress={onRetryAll}
            leftSlot={<RefreshCw size={14} color={palette.brand[600]} strokeWidth={2.2} />}
          />
        ) : null}
      </Card>
    </View>
  );
}
