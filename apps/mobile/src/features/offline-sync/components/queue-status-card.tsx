import { GlassView } from 'expo-glass-effect';
import { CheckCircle2, CloudOff, Inbox, RefreshCw, TriangleAlert } from 'lucide-react-native';
import { Platform, Pressable } from 'react-native';

import { useNetworkStore } from '../store/network.store';
import { useSyncStatusStore } from '../store/sync-status.store';
import { useOfflineQueueStore } from '@/features/upload-report/store/offline-queue.store';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

interface QueueStatusCardProps {
  className?: string;
  onRetryAll?: () => void;
}

/**
 * Surfaces the offline queue's state in a glass card. Suitable for the
 * dashboard and upload screens.
 *
 *  - Hidden when there are no queued items AND the most recent sync succeeded.
 *  - Shows queue depth, last error, and per-state counts when applicable.
 *  - Optional "Retry now" action.
 */
export function QueueStatusCard({ className, onRetryAll }: QueueStatusCardProps) {
  const theme = useTheme();
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
  const headlineIcon = offline ? (
    <CloudOff size={18} color="#f59e0b" strokeWidth={2.2} />
  ) : phase === 'failed' || failed > 0 ? (
    <TriangleAlert size={18} color={theme.danger} strokeWidth={2.2} />
  ) : phase === 'syncing' ? (
    <RefreshCw size={18} color={palette.brand[300]} strokeWidth={2.2} />
  ) : (
    <Inbox size={18} color={palette.brand[300]} strokeWidth={2.2} />
  );

  const headline = offline
    ? `${items.length} ${items.length === 1 ? 'upload' : 'uploads'} waiting`
    : phase === 'syncing'
      ? `Syncing ${items.length} ${items.length === 1 ? 'upload' : 'uploads'}`
      : phase === 'failed' || failed > 0
        ? `${items.length} pending · ${failed} need attention`
        : `${items.length} pending sync`;

  const subline = offline
    ? "Saved on this device. We'll send them as soon as you're back online."
    : lastError
      ? lastError
      : `Pending ${pending} · Uploading ${uploading}${failed ? ` · Failed ${failed}` : ''}`;

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      <View
        className={[
          'gap-3 rounded-[20px] border p-3',
          phase === 'failed' || failed > 0
            ? 'border-danger/30'
            : offline
              ? 'border-warning/30'
              : 'border-white/10',
          className ?? '',
        ].join(' ')}
      >
        <View className="flex-row items-start gap-3">
          <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-2xl bg-surface">
            {headlineIcon}
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-semibold text-text">{headline}</Text>
            <Text className="text-[11px] text-text-muted" numberOfLines={2}>
              {subline}
            </Text>
            {lastSyncedAt && phase !== 'failed' && !offline ? (
              <View className="mt-1 flex-row items-center gap-1.5">
                <CheckCircle2 size={11} color={palette.brand[400]} strokeWidth={2.4} />
                <Text className="text-[10px] text-text-subtle">
                  Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {!offline && (failed > 0 || phase === 'failed') && onRetryAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry sync"
            onPress={onRetryAll}
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
          >
            <View className="flex-row items-center justify-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 py-2">
              <RefreshCw size={14} color={palette.brand[300]} strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-brand-300">Retry now</Text>
            </View>
          </Pressable>
        ) : null}
      </View>
    </GlassView>
  );
}
