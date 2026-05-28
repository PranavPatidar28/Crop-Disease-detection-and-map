import { GlassView } from 'expo-glass-effect';
import { Filter, Layers, Locate } from 'lucide-react-native';
import { Platform } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

interface MapControlsProps {
  layerMode: 'markers' | 'heatmap' | 'both';
  filtersActive: boolean;
  onLocate: () => void;
  onLayerToggle: () => void;
  onFilter: () => void;
}

export function MapControls({
  layerMode,
  filtersActive,
  onLocate,
  onLayerToggle,
  onFilter,
}: MapControlsProps) {
  const theme = useTheme();

  return (
    <View className="gap-2">
      <ControlButton onPress={onLocate} accessibilityLabel="Center on me">
        <Locate size={18} color={theme.text} strokeWidth={2.2} />
      </ControlButton>

      <ControlButton onPress={onLayerToggle} accessibilityLabel="Toggle map layers">
        <Layers size={18} color={theme.text} strokeWidth={2.2} />
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          {layerMode === 'markers' ? 'Pins' : layerMode === 'heatmap' ? 'Heat' : 'Both'}
        </Text>
      </ControlButton>

      <ControlButton onPress={onFilter} accessibilityLabel="Open filters">
        <Filter size={18} color={theme.text} strokeWidth={2.2} />
        {filtersActive ? (
          <View
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: palette.brand[400],
              borderWidth: 1.5,
              borderColor: theme.surfaceElevated,
            }}
          />
        ) : null}
      </ControlButton>
    </View>
  );
}

function ControlButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      pressedScale={0.92}
      haptic="selection"
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={
          Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : `${theme.surfaceElevated}E6`
        }
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        <View className="h-12 w-12 items-center justify-center gap-0.5 rounded-2xl border border-white/15">
          {children}
        </View>
      </GlassView>
    </PressableScale>
  );
}
