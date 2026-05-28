import { CloudOff, RefreshCw, Wifi } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNetworkStore } from '@/features/offline-sync/store/network.store';
import { useSyncStatusStore } from '@/features/offline-sync/store/sync-status.store';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

type Tone = {
  /** Tailwind class for surface (tint) background. */
  bgClass: string;
  /** Tailwind class for border. */
  borderClass: string;
  /** Tailwind class for label text. */
  textClass: string;
  /** Tailwind class for muted/sub text. */
  subTextClass: string;
  /** Hex color used by the icon. */
  iconColor: string;
};

const TONE: Record<'offline' | 'unstable' | 'syncing', Tone> = {
  offline: {
    bgClass: 'bg-warning-tint',
    borderClass: 'border-warning-tint',
    textClass: 'text-warning',
    subTextClass: 'text-warning/80',
    iconColor: palette.status.warning,
  },
  unstable: {
    bgClass: 'bg-warning-tint',
    borderClass: 'border-warning-tint',
    textClass: 'text-warning',
    subTextClass: 'text-warning/80',
    iconColor: palette.status.warning,
  },
  syncing: {
    bgClass: 'bg-brand-50',
    borderClass: 'border-brand-100',
    textClass: 'text-brand-700',
    subTextClass: 'text-brand-700/80',
    iconColor: palette.brand[600],
  },
};

/**
 * Persistent connectivity banner. Slides in from the top when offline or
 * unstable, plus a brief syncing state when reconnecting from offline with
 * queued items. Soft Sage light styling.
 */
export function OfflineBanner() {
  const state = useNetworkStore((s) => s.state);
  const queueDepth = useSyncStatusStore((s) => s.queueDepth);
  const phase = useSyncStatusStore((s) => s.phase);

  const isOffline = state === 'offline';
  const isUnstable = state === 'unstable';
  const showSyncing = state === 'online' && phase === 'syncing' && queueDepth > 0;
  const visible = isOffline || isUnstable || showSyncing;

  if (!visible) return null;

  const variant: 'offline' | 'unstable' | 'syncing' = isOffline
    ? 'offline'
    : isUnstable
      ? 'unstable'
      : 'syncing';
  const tone = TONE[variant];

  const label = isOffline
    ? "You're offline"
    : isUnstable
      ? 'Network is unstable'
      : `Syncing ${queueDepth} ${queueDepth === 1 ? 'upload' : 'uploads'}…`;

  const subtext = isOffline
    ? queueDepth > 0
      ? `· ${queueDepth} report${queueDepth === 1 ? '' : 's'} queued · will sync when connected`
      : '· cached data shown'
    : isUnstable
      ? '· retrying automatically'
      : '· almost done';

  return (
    <SafeAreaView
      edges={['top']}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutUp.duration(180)}
        pointerEvents="box-none"
        style={{ paddingHorizontal: 12, paddingTop: 4 }}
      >
        <View
          className={`flex-row items-center gap-2 rounded-xl border ${tone.borderClass} ${tone.bgClass} px-3 py-2`}
        >
          <PulsingIcon variant={variant} color={tone.iconColor} />
          <Text className={`text-xs font-bold ${tone.textClass}`}>{label}</Text>
          <Text className={`flex-1 text-xs ${tone.subTextClass}`} numberOfLines={1}>
            {subtext}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function PulsingIcon({
  variant,
  color,
}: {
  variant: 'offline' | 'unstable' | 'syncing';
  color: string;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      {variant === 'offline' ? (
        <CloudOff size={14} color={color} strokeWidth={2.4} />
      ) : variant === 'unstable' ? (
        <Wifi size={14} color={color} strokeWidth={2.4} />
      ) : (
        <RefreshCw size={14} color={color} strokeWidth={2.4} />
      )}
    </Animated.View>
  );
}
