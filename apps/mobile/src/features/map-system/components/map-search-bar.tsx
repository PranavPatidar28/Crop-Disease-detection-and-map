import { GlassView } from 'expo-glass-effect';
import { Search } from 'lucide-react-native';
import { Platform, Pressable } from 'react-native';

import { ConnectionPill } from '@/features/map-system/components/connection-pill';
import { Text } from '@/tw';
import { palette } from '@/theme/colors';

interface MapSearchBarProps {
  isConnected: boolean;
  reportCount: number;
  onPressSearch: () => void;
}

/**
 * The Map screen's top search bar — frosted glass. Tapping opens the filter
 * sheet (faux search field for now). The connection/count pill sits on the
 * right. The dedicated filter button has moved to the controls capsule, so it
 * is no longer duplicated here.
 */
export function MapSearchBar({ isConnected, reportCount, onPressSearch }: MapSearchBarProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search area or crop"
      onPress={onPressSearch}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 18,
          overflow: 'hidden',
          paddingHorizontal: 14,
          paddingVertical: 11,
          shadowColor: '#282e26',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
        }}
      >
        <Search size={16} color={palette.brand[700]} strokeWidth={2.2} />
        <Text className="flex-1 text-sm font-medium text-text-faint" numberOfLines={1}>
          Search area or crop…
        </Text>
        <ConnectionPill isConnected={isConnected} reportCount={reportCount} />
      </GlassView>
    </Pressable>
  );
}
