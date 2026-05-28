import { GlassView } from 'expo-glass-effect';
import { CloudOff, Wifi } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';
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
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

/**
 * Persistent connectivity banner. Slides in from the top when offline or
 * unstable, plus a brief celebratory state when reconnecting from offline
 * with queued items.
 */
export function OfflineBanner() {
  const theme = useTheme();
  const state = useNetworkStore((s) => s.state);
  const queueDepth = useSyncStatusStore((s) => s.queueDepth);
  const phase = useSyncStatusStore((s) => s.phase);

  const isOffline = state === 'offline';
  const isUnstable = state === 'unstable';
  const showSyncing = state === 'online' && phase === 'syncing' && queueDepth > 0;

  const visible = isOffline || isUnstable || showSyncing;

  if (!visible) return null;

  const tone = isOffline
    ? { fg: theme.text, bg: 'rgba(245, 158, 11, 0.12)', accent: palette.brand[400], color: '#f59e0b' }
    : isUnstable
      ? { fg: theme.text, bg: 'rgba(245, 158, 11, 0.10)', accent: '#f59e0b', color: '#f59e0b' }
      : { fg: theme.text, bg: 'rgba(16, 185, 129, 0.12)', accent: palette.brand[500], color: palette.brand[400] };

  const label = isOffline
    ? "You're offline"
    : isUnstable
      ? 'Network is unstable'
      : `Syncing ${queueDepth} ${queueDepth === 1 ? 'upload' : 'uploads'}…`;

  const subtext = isOffline
    ? queueDepth > 0
      ? `${queueDepth} pending — we'll sync when you're back`
      : 'Your work is saved locally'
    : isUnstable
      ? 'Some requests may fail; we’ll retry automatically'
      : 'Almost done';

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
        <GlassView
          glassEffectStyle="regular"
          tintColor={
            Platform.OS === 'ios'
              ? `${theme.surfaceElevated}DD`
              : `${theme.surfaceElevated}EE`
          }
          style={{ borderRadius: 16, overflow: 'hidden' }}
        >
          <View
            className="flex-row items-center gap-3 rounded-2xl border border-white/10 px-3 py-2"
            style={{ backgroundColor: tone.bg }}
          >
            <PulsingIcon offline={isOffline} color={tone.color} />
            <View className="flex-1 gap-0.5">
              <Text className="text-xs font-semibold text-text">{label}</Text>
              <Text className="text-[11px] text-text-muted" numberOfLines={1}>
                {subtext}
              </Text>
            </View>
          </View>
        </GlassView>
      </Animated.View>
    </SafeAreaView>
  );
}

function PulsingIcon({ offline, color }: { offline: boolean; color: string }) {
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
      {offline ? (
        <CloudOff size={16} color={color} strokeWidth={2.4} />
      ) : (
        <Wifi size={16} color={color} strokeWidth={2.4} />
      )}
    </Animated.View>
  );
}
