import { ActivityIndicator } from 'react-native';
import { CheckCircle2, CircleAlert, CloudOff, RefreshCw } from 'lucide-react-native';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import { useNetworkStore } from '../store/network.store';
import { useSyncStatusStore } from '../store/sync-status.store';

interface SyncIndicatorProps {
  /** Show in compact pill form (for headers) or expanded label (cards). */
  variant?: 'pill' | 'inline';
  className?: string;
}

type Tone = 'idle' | 'syncing' | 'offline' | 'failed';

/**
 * Compact status read-out — pairs nicely with `OfflineBanner` for pages that
 * want sync feedback below the banner (e.g. dashboard or upload form).
 *
 * Soft Sage light styling — surface backgrounds with severity-tinted dots.
 */
export function SyncIndicator({ variant = 'pill', className }: SyncIndicatorProps) {
  const networkState = useNetworkStore((s) => s.state);
  const phase = useSyncStatusStore((s) => s.phase);
  const queueDepth = useSyncStatusStore((s) => s.queueDepth);
  const lastError = useSyncStatusStore((s) => s.lastError);

  const offline = networkState === 'offline';
  const syncing = phase === 'syncing';
  const failed = phase === 'failed';

  let icon: React.ReactNode;
  let label: string;
  let tone: Tone = 'idle';

  if (offline) {
    icon = <CloudOff size={12} color={palette.status.warning} strokeWidth={2.4} />;
    label = queueDepth > 0 ? `${queueDepth} queued` : 'Offline';
    tone = 'offline';
  } else if (failed) {
    icon = <CircleAlert size={12} color={palette.status.danger} strokeWidth={2.4} />;
    label = lastError ? 'Sync failed' : 'Some uploads failed';
    tone = 'failed';
  } else if (syncing) {
    icon = <ActivityIndicator size="small" color={palette.brand[600]} />;
    label = `Syncing ${queueDepth || ''}`.trim();
    tone = 'syncing';
  } else if (queueDepth > 0) {
    icon = <RefreshCw size={12} color={palette.brand[600]} strokeWidth={2.4} />;
    label = `${queueDepth} pending`;
    tone = 'syncing';
  } else {
    icon = <CheckCircle2 size={12} color={palette.brand[600]} strokeWidth={2.4} />;
    label = 'All synced';
    tone = 'idle';
  }

  const containerByTone: Record<Tone, string> = {
    idle: 'bg-surface border-border',
    syncing: 'bg-brand-50 border-brand-100',
    offline: 'bg-warning-tint border-warning-tint',
    failed: 'bg-danger-tint border-danger-tint',
  };

  const textByTone: Record<Tone, string> = {
    idle: 'text-text-subtle',
    syncing: 'text-brand-700',
    offline: 'text-warning',
    failed: 'text-danger',
  };

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border',
        containerByTone[tone],
        variant === 'pill' ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
    >
      {icon}
      <Text className={cn('text-[11px] font-semibold', textByTone[tone])}>{label}</Text>
    </View>
  );
}
