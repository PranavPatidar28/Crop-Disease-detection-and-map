import { ChevronRight, Layers } from 'lucide-react-native';
import { memo } from 'react';

import { PressableScale } from '@/components/ui/pressable-scale';
import { CROP_BY_NAME } from '@/constants/crops';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import type { Plot } from '../api/plots.api';

interface PlotCardProps {
  plot: Plot;
  onPress?: (plot: Plot) => void;
}

function PlotCardImpl({ plot, onPress }: PlotCardProps) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => onPress?.(plot)}
      pressedScale={0.98}
    >
      <View
        className={`flex-row items-center gap-3 rounded-2xl border bg-surface p-3 ${
          plot.active ? 'border-border' : 'border-border-strong opacity-60'
        }`}
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15">
          <Layers size={20} color={palette.brand[300]} strokeWidth={2.2} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-text" numberOfLines={1}>
              {plot.name}
            </Text>
            {!plot.active ? (
              <Text className="text-[10px] uppercase tracking-wider text-text-subtle">
                Removed
              </Text>
            ) : null}
          </View>
          <Text className="text-[11px] text-text-muted">
            {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
            {plot.areaAcres != null ? ` · ${plot.areaAcres} ac` : ''}
          </Text>
          {plot.cropTypes.length > 0 ? (
            <View className="mt-1 flex-row flex-wrap gap-1">
              {plot.cropTypes.slice(0, 3).map((c) => {
                const known = CROP_BY_NAME[c.toLowerCase()];
                return (
                  <View
                    key={c}
                    className="rounded-full bg-brand-500/10 px-2 py-0.5"
                  >
                    <Text className="text-[10px] font-medium text-brand-300">
                      {known?.emoji ?? ''} {c}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
        <ChevronRight size={18} color={theme.textSubtle} strokeWidth={2} />
      </View>
    </PressableScale>
  );
}

export const PlotCard = memo(PlotCardImpl);
