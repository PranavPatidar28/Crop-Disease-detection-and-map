import { Search, X } from 'lucide-react-native';
import { TextInput } from 'react-native';

import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { PressableScale } from '@/components/ui/pressable-scale';
import type {
  ReportFilter,
  SeverityFilter,
  StatusFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { View } from '@/tw';

interface ReportFilterBarProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
}

const SEVERITY_OPTIONS: DropdownOption<SeverityFilter>[] = [
  { value: 'all', label: 'All severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS: DropdownOption<StatusFilter>[] = [
  { value: 'all', label: 'Any status' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

// Pill label shows the active selection, or the category name when 'all'.
const SEVERITY_PILL: Record<SeverityFilter, string> = {
  all: 'Severity',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const STATUS_PILL: Record<StatusFilter, string> = {
  all: 'Status',
  analyzed: 'Analyzed',
  processing: 'Processing',
  failed: 'Failed',
};

/**
 * Search + severity + status filters for the reports history screen. Purely
 * controlled — owns no state. Severity/Status are anchored dropdowns (open on
 * top of all UI); filtering happens client-side in the screen via
 * filterReports().
 */
export function ReportFilterBar({ value, onChange }: ReportFilterBarProps) {
  const theme = useTheme();

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
        <Dropdown
          triggerVariant="pill"
          align="start"
          value={value.severity === 'all' ? null : value.severity}
          items={SEVERITY_OPTIONS}
          onSelect={(severity) => onChange({ ...value, severity })}
          label={SEVERITY_PILL[value.severity]}
        />
        <Dropdown
          triggerVariant="pill"
          align="end"
          value={value.status === 'all' ? null : value.status}
          items={STATUS_OPTIONS}
          onSelect={(status) => onChange({ ...value, status })}
          label={STATUS_PILL[value.status]}
        />
      </View>
    </View>
  );
}
