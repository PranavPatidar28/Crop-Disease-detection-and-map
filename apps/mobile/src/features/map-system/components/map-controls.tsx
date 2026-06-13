import { Layers, List, Locate, SlidersHorizontal } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { SurfaceCard } from '@/features/map-system/components/surface-card';
import { View } from '@/tw';
import { lightColors, palette } from '@/theme/colors';

interface MapControlsProps {
  layerMode: 'markers' | 'heatmap' | 'both';
  filtersActive: boolean;
  onLocate: () => void;
  onLayerToggle: () => void;
  onFilter: () => void;
  onList: () => void;
}

const CapsuleBtn = ({
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
    pressedScale={0.9}
    haptic="selection"
    className="h-11 w-11 items-center justify-center rounded-2xl"
  >
    {children}
    {active ? (
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.brand[600],
        }}
      />
    ) : null}
  </PressableScale>
);

const Divider = () => (
  <View style={{ height: 1, marginHorizontal: 8, backgroundColor: lightColors.border }} />
);

/**
 * Single floating control capsule: locate, layer-toggle, filter, list. The
 * filter affordance lives here only (the search bar no longer duplicates it).
 */
export function MapControls({
  layerMode,
  filtersActive,
  onLocate,
  onLayerToggle,
  onFilter,
  onList,
}: MapControlsProps) {
  const layerActive = layerMode !== 'markers';
  return (
    <SurfaceCard radius={20} padding={4}>
      <CapsuleBtn onPress={onLocate} accessibilityLabel="Center on me">
        <Locate size={18} color={palette.brand[700]} strokeWidth={2.2} />
      </CapsuleBtn>
      <Divider />
      <CapsuleBtn active={layerActive} onPress={onLayerToggle} accessibilityLabel="Toggle map layers">
        <Layers
          size={18}
          color={layerActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </CapsuleBtn>
      <Divider />
      <CapsuleBtn active={filtersActive} onPress={onFilter} accessibilityLabel="Open filters">
        <SlidersHorizontal
          size={18}
          color={filtersActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </CapsuleBtn>
      <Divider />
      <CapsuleBtn onPress={onList} accessibilityLabel="List reports in view">
        <List size={18} color={palette.brand[700]} strokeWidth={2.2} />
      </CapsuleBtn>
    </SurfaceCard>
  );
}
