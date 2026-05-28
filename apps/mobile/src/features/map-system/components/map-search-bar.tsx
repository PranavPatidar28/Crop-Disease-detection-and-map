import { Search, SlidersHorizontal } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { ConnectionPill } from '@/features/map-system/components/connection-pill';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

interface MapSearchBarProps {
  isConnected: boolean;
  reportCount: number;
  onPressSearch: () => void;
  onPressFilter: () => void;
}

/**
 * The Map screen's top bar. A faux search field on the left (taps open the
 * filter sheet for now) plus a dedicated filter button on the right.
 * The connection pill lives inside the search field's right edge.
 */
export function MapSearchBar({
  isConnected,
  reportCount,
  onPressSearch,
  onPressFilter,
}: MapSearchBarProps) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Search area or crop"
        onPress={onPressSearch}
        className="flex-1 flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <Search size={16} color={palette.brand[700]} strokeWidth={2.2} />
        <Text className="flex-1 text-sm font-medium text-text-faint" numberOfLines={1}>
          Search area or crop…
        </Text>
        <ConnectionPill isConnected={isConnected} reportCount={reportCount} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open filters"
        onPress={onPressFilter}
        className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <SlidersHorizontal size={18} color={palette.brand[700]} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
