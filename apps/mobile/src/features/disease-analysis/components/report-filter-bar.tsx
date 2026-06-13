import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useRef } from 'react';
import { TextInput } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';

import { PressableScale } from '@/components/ui/pressable-scale';
import { ReportFilterSheet } from '@/features/disease-analysis/components/report-filter-sheet';
import type {
  ReportFilter,
  SeverityFilter,
  StatusFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

interface ReportFilterBarProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
  /** Count shown on the sheet's apply button. */
  matchingCount: number;
}

const SEVERITY_LABELS: Record<SeverityFilter, string> = {
  all: 'Severity',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Status',
  analyzed: 'Analyzed',
  processing: 'Processing',
  failed: 'Failed',
};

/**
 * Search + filter triggers for the reports history screen. Purely controlled —
 * owns no filter state. The severity/status options live in a bottom sheet
 * (ReportFilterSheet) opened by the trigger buttons, keeping the bar compact.
 * Filtering itself happens client-side in the screen via filterReports().
 */
export function ReportFilterBar({ value, onChange, matchingCount }: ReportFilterBarProps) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);

  const openSheet = () => sheetRef.current?.present();

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <Search size={16} color={palette.brand[400]} strokeWidth={2.2} />
        <TextInput
          value={value.search}
          onChangeText={(search) => onChange({ ...value, search })}
          placeholder="Search crop or disease"
          placeholderTextColor={theme.textFaint}
          style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.search.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChange({ ...value, search: '' })}
            pressedScale={0.9}
            haptic="selection"
            hitSlop={8}
          >
            <X size={16} color={palette.brand[400]} strokeWidth={2.2} />
          </PressableScale>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        <FilterTrigger
          label={SEVERITY_LABELS[value.severity]}
          active={value.severity !== 'all'}
          onPress={openSheet}
          leftSlot={
            <SlidersHorizontal
              size={14}
              color={value.severity !== 'all' ? '#fff' : palette.brand[600]}
              strokeWidth={2.2}
            />
          }
        />
        <FilterTrigger
          label={STATUS_LABELS[value.status]}
          active={value.status !== 'all'}
          onPress={openSheet}
        />
      </View>

      <ReportFilterSheet
        ref={sheetRef}
        value={value}
        onChange={onChange}
        matchingCount={matchingCount}
      />
    </View>
  );
}

interface FilterTriggerProps {
  label: string;
  active: boolean;
  onPress: () => void;
  leftSlot?: React.ReactNode;
}

function FilterTrigger({ label, active, onPress, leftSlot }: FilterTriggerProps) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
      onPress={onPress}
      pressedScale={0.97}
      haptic="selection"
      className="flex-1"
    >
      <View
        className={cn(
          'flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5',
          active ? 'border-brand-600 bg-brand-600' : 'border-border bg-surface',
        )}
      >
        {leftSlot}
        <Text
          className={cn(
            'text-[13px] font-bold',
            active ? 'text-white' : 'text-text',
          )}
          numberOfLines={1}
        >
          {label}
        </Text>
        <ChevronDown
          size={14}
          color={active ? '#fff' : theme.textMuted}
          strokeWidth={2.2}
        />
      </View>
    </PressableScale>
  );
}
