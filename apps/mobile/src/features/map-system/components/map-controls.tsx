import { GlassView } from 'expo-glass-effect';
import { Layers, Locate, SlidersHorizontal } from 'lucide-react-native';
import { Platform } from 'react-native';

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
  <View style={{ height: 1, marginHorizontal: 8, backgroundColor: 'rgba(40,46,38,0.10)' }} />
);

/**
 * Single floating glass capsule: locate, layer-toggle, filter. The filter
 * affordance lives here only (the search bar no longer duplicates it).
 */
export function MapControls({
  layerMode,
  filtersActive,
  onLocate,
  onLayerToggle,
  onFilter,
}: MapControlsProps) {
  const layerActive = layerMode !== 'markers';
  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        padding: 4,
        shadowColor: '#282e26',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
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
    </GlassView>
  );
}
