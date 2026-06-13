import { GlassView } from 'expo-glass-effect';
import { MapPin, Navigation } from 'lucide-react-native';
import { Platform } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { ReportLocation } from '../types';

interface LocationCardProps {
  location: ReportLocation | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'fetching' | 'ready' | 'error';
  errorMessage?: string | null;
  onRefresh: () => void;
  onAdjust: () => void;
}

export function LocationCard({
  location,
  status,
  errorMessage,
  onRefresh,
  onAdjust,
}: LocationCardProps) {
  const theme = useTheme();
  const isLoading = status === 'requesting' || status === 'fetching';

  const subtitle = (() => {
    if (errorMessage) return errorMessage;
    if (isLoading) return 'Getting your current location…';
    if (location) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${
        location.manual ? ' · adjusted' : ' · GPS'
      }`;
    }
    return 'Tap to detect or adjust';
  })();

  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      <View
        className={`gap-3 rounded-[20px] border p-3 ${
          errorMessage ? 'border-danger/40' : 'border-border'
        }`}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15">
            <MapPin size={22} color={palette.brand[600]} strokeWidth={2.2} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
              Location
            </Text>
            <Text className="text-base font-semibold text-text" numberOfLines={1}>
              {location ? (location.manual ? 'Custom location' : 'Current location') : 'Not set'}
            </Text>
            <Text
              className={`text-[11px] ${errorMessage ? 'text-danger' : 'text-text-muted'}`}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Use my GPS"
            onPress={onRefresh}
            disabled={isLoading}
            haptic="selection"
            pressedScale={0.97}
            className="flex-1"
          >
            <View className={`flex-row items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2.5 ${isLoading ? 'opacity-50' : ''}`}>
              <Navigation size={14} color={theme.text} strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-text">
                {isLoading ? 'Locating…' : 'Use my GPS'}
              </Text>
            </View>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Adjust on map"
            onPress={onAdjust}
            haptic="selection"
            pressedScale={0.97}
            className="flex-1"
          >
            <View className="flex-row items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 py-2.5">
              <MapPin size={14} color={palette.brand[600]} strokeWidth={2.2} />
              <Text className="text-xs font-semibold text-brand-700">Adjust on map</Text>
            </View>
          </PressableScale>
        </View>
      </View>
    </GlassView>
  );
}
