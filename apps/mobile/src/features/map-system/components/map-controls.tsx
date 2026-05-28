import { Layers, Locate, SlidersHorizontal } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { View } from '@/tw';
import { palette } from '@/theme/colors';

interface MapControlsProps {
  layerMode: 'markers' | 'heatmap' | 'both';
  filtersActive: boolean;
  onLocate: () => void;
  onLayerToggle: () => void;
  onFilter: () => void;
}

const FabBtn = ({
  active,
  onPress,
  accessibilityLabel,
  children,
}: {
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) => (
  <PressableScale
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    pressedScale={0.92}
    haptic="selection"
    className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface"
    style={{
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }}
  >
    {children}
    {active ? (
      <View
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.brand[600],
        }}
      />
    ) : null}
  </PressableScale>
);

export function MapControls({
  layerMode,
  filtersActive,
  onLocate,
  onLayerToggle,
  onFilter,
}: MapControlsProps) {
  const layerActive = layerMode !== 'markers';
  return (
    <View className="gap-2">
      <FabBtn onPress={onLocate} accessibilityLabel="Center on me">
        <Locate size={18} color={palette.brand[700]} strokeWidth={2.2} />
      </FabBtn>
      <FabBtn active={layerActive} onPress={onLayerToggle} accessibilityLabel="Toggle map layers">
        <Layers
          size={18}
          color={layerActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </FabBtn>
      <FabBtn active={filtersActive} onPress={onFilter} accessibilityLabel="Open filters">
        <SlidersHorizontal
          size={18}
          color={filtersActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </FabBtn>
    </View>
  );
}
