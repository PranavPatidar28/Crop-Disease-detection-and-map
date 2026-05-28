import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useMapFiltersStore } from '@/features/map-system/store/map-filters.store';
import type { Severity } from '@/features/upload-report/types';
import { View } from '@/tw';

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const WINDOW_OPTIONS = [
  { value: '24h' as const, label: '24h' },
  { value: '7d' as const, label: '7d' },
  { value: '30d' as const, label: '30d' },
  { value: 'all' as const, label: 'All time' },
];

/**
 * Horizontal chip rail for the map's most-used filters. The full filter sheet
 * (severity + crop + disease + advanced) remains accessible via the gear icon.
 *
 * Adapts the chip handlers to the existing `setSeverities` / `setWindow`
 * actions on the store — there is no `toggleSeverity` action.
 */
export function MapFilterChips() {
  const severities = useMapFiltersStore((s) => s.severities);
  const window = useMapFiltersStore((s) => s.window);
  const crops = useMapFiltersStore((s) => s.crops);
  const diseases = useMapFiltersStore((s) => s.diseases);
  const setSeverities = useMapFiltersStore((s) => s.setSeverities);
  const setWindow = useMapFiltersStore((s) => s.setWindow);
  const reset = useMapFiltersStore((s) => s.reset);

  const allActive =
    severities.length === 0 &&
    crops.length === 0 &&
    diseases.length === 0 &&
    window === 'all';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 6, alignItems: 'center' }}
    >
      <Chip label="All" active={allActive} onPress={() => reset()} />
      {SEVERITY_OPTIONS.map((opt) => {
        const active = severities.includes(opt.value);
        return (
          <Chip
            key={opt.value}
            label={opt.label}
            active={active}
            tone="warning"
            onPress={() => {
              const next = active
                ? severities.filter((s) => s !== opt.value)
                : [...severities, opt.value];
              setSeverities(next);
            }}
          />
        );
      })}
      <View
        style={{ width: 1, alignSelf: 'stretch', backgroundColor: '#efeae0', marginHorizontal: 4 }}
      />
      {WINDOW_OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={window === opt.value}
          onPress={() => setWindow(opt.value)}
        />
      ))}
    </ScrollView>
  );
}
