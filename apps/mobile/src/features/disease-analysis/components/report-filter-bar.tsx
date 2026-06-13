import { Search, X } from 'lucide-react-native';
import { ScrollView, TextInput } from 'react-native';

import { Chip } from '@/components/ui/chip';
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

const SEVERITY_OPTIONS: { key: SeverityFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'LOW', label: 'Low' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Any status' },
  { key: 'analyzed', label: 'Analyzed' },
  { key: 'processing', label: 'Processing' },
  { key: 'failed', label: 'Failed' },
];

/**
 * Search + severity + status filters for the reports history screen. Purely
 * controlled — owns no state. Filtering itself happens client-side in the
 * screen via filterReports().
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
          >
            <X size={16} color={palette.brand[400]} strokeWidth={2.2} />
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {SEVERITY_OPTIONS.map((opt) => (
          <Chip
            key={`sev-${opt.key}`}
            label={opt.label}
            active={value.severity === opt.key}
            tone="brand"
            onPress={() => onChange({ ...value, severity: opt.key })}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={`status-${opt.key}`}
            label={opt.label}
            active={value.status === opt.key}
            tone="neutral"
            onPress={() => onChange({ ...value, status: opt.key })}
          />
        ))}
      </ScrollView>
    </View>
  );
}
