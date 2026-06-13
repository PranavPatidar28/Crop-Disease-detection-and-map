import { Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { SurfaceCard } from '@/features/map-system/components/surface-card';
import { lightColors, palette } from '@/theme/colors';

interface MapSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
}

/**
 * The Map screen's top search bar — a solid white card with a live text field
 * that filters the visible report markers by crop or disease name. The
 * connection/count pill now lives on the filter chip rail below, so the field
 * stays focused on search alone.
 */
export function MapSearchBar({ value, onChangeText }: MapSearchBarProps) {
  const [focused, setFocused] = useState(false);

  return (
    <SurfaceCard
      radius={18}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        height: 52,
        borderColor: focused ? palette.brand[400] : lightColors.border,
        borderWidth: focused ? 1.5 : 1,
      }}
    >
      <Search size={18} color={palette.brand[700]} strokeWidth={2.2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search crop or disease…"
        placeholderTextColor={palette.brand[400]}
        returnKeyType="search"
        autoCorrect={false}
        accessibilityLabel="Search reports by crop or disease"
        style={{
          flex: 1,
          fontSize: 16,
          fontWeight: '500',
          color: palette.brand[900],
          padding: 0,
        }}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
          onPress={() => onChangeText('')}
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: lightColors.surfaceMuted,
          }}
        >
          <X size={15} color={palette.brand[600]} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}
