import { ActivityIndicator } from 'react-native';
import { CheckCircle2, CircleAlert, CloudOff, RefreshCw } from 'lucide-react-native';

import { useNetworkStore } from '../store/network.store';
import { useSyncStatusStore } from '../store/sync-status.store';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

interface SyncIndicatorProps {
  /** Show in compact pill form (for headers) or expanded label (cards). */
  variant?: 'pill' | 'inline';
  className?: string;
}

/**
 * Compact status read-out — pairs nicely with `OfflineBanner` for pages that
 * want sync feedback below the banner (e.g. dashboard or upload form).
 */
export function SyncIndicator({ variant = 'pill', className }: SyncIndicatorProps) {
  const theme = useTheme();
  const networkState = useNetworkStore((s) => s.state);
  const phase = useSyncStatusStore((s) => s.phase);
  const queueDepth = useSyncStatusStore((s) => s.queueDepth);
  const lastError = useSyncStatusStore((s) => s.lastError);

  const offline = networkState === 'offline';
  const syncing = phase === 'syncing';
  const failed = phase === 'failed';

  let icon: React.ReactNode;
  let label: string;
  let tone: 'idle' | 'syncing' | 'offline' | 'failed' = 'idle';

  if (offline) {
    icon = <CloudOff size={12} color="#f59e0b" strokeWidth={2.4} />;
    label = queueDepth > 0 ? `${queueDepth} queued` : 'Offline';
    tone = 'offline';
  } else if (failed) {
    icon = <CircleAlert size={12} color={theme.danger} strokeWidth={2.4} />;
    label = lastError ? 'Sync failed' : 'Some uploads failed';
    tone = 'failed';
  } else if (syncing) {
    icon = <ActivityIndicator size="small" color={palette.brand[400]} />;
    label = `Syncing ${queueDepth || ''}`.trim();
    tone = 'syncing';
  } else if (queueDepth > 0) {
    icon = <RefreshCw size={12} color={palette.brand[300]} strokeWidth={2.4} />;
    label = `${queueDepth} pending`;
    tone = 'syncing';
  } else {
    icon = <CheckCircle2 size={12} color={palette.brand[400]} strokeWidth={2.4} />;
    label = 'All synced';
    tone = 'idle';
  }

  const styleByTone: Record<typeof tone, string> = {
    idle: 'bg-surface border-border',
    syncing: 'bg-brand-500/10 border-brand-500/30',
    offline: 'bg-warning/10 border-warning/30',
    failed: 'bg-danger/10 border-danger/30',
  };

  const textByTone: Record<typeof tone, string> = {
    idle: 'text-text-muted',
    syncing: 'text-brand-300',
    offline: 'text-warning',
    failed: 'text-danger',
  };

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 rounded-full border',
        styleByTone[tone],
        variant === 'pill' ? 'px-2.5 py-1' : 'px-3 py-1.5',
        className,
      )}
    >
      {icon}
      <Text className={cn('text-[11px] font-semibold', textByTone[tone])}>
        {label}
      </Text>
    </View>
  );
}
