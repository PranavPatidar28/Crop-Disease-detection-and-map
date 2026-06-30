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
import { useTranslation } from '@/i18n';
import { palette } from '@/theme/colors';
import { View } from '@/tw';

interface ReportFilterBarProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
}

/**
 * Search + severity + status filters for the reports history screen. Purely
 * controlled — owns no state. Severity/Status are anchored dropdowns (open on
 * top of all UI); filtering happens client-side in the screen via
 * filterReports().
 */
export function ReportFilterBar({ value, onChange }: ReportFilterBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const severityOptions: DropdownOption<SeverityFilter>[] = [
    { value: 'all', label: t('reportFilter.allSeverities') },
    { value: 'LOW', label: t('severity.low') },
    { value: 'MEDIUM', label: t('severity.medium') },
    { value: 'HIGH', label: t('severity.high') },
  ];

  const statusOptions: DropdownOption<StatusFilter>[] = [
    { value: 'all', label: t('reportFilter.anyStatus') },
    { value: 'analyzed', label: t('reportFilter.analyzed') },
    { value: 'processing', label: t('reportFilter.processing') },
    { value: 'failed', label: t('reportFilter.failed') },
  ];

  // Pill label shows the active selection, or the category name when 'all'.
  const severityPill: Record<SeverityFilter, string> = {
    all: t('reportFilter.severity'),
    LOW: t('severity.low'),
    MEDIUM: t('severity.medium'),
    HIGH: t('severity.high'),
  };

  const statusPill: Record<StatusFilter, string> = {
    all: t('reportFilter.status'),
    analyzed: t('reportFilter.analyzed'),
    processing: t('reportFilter.processing'),
    failed: t('reportFilter.failed'),
  };

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <Search size={16} color={palette.brand[400]} strokeWidth={2.2} />
        <TextInput
          value={value.search}
          onChangeText={(search) => onChange({ ...value, search })}
          placeholder={t('search.cropOrDisease')}
          placeholderTextColor={theme.textFaint}
          style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.search.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('common.clearSearch')}
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
          className="flex-1"
          value={value.severity === 'all' ? null : value.severity}
          items={severityOptions}
          onSelect={(severity) => onChange({ ...value, severity })}
          label={severityPill[value.severity]}
        />
        <Dropdown
          triggerVariant="pill"
          align="end"
          className="flex-1"
          value={value.status === 'all' ? null : value.status}
          items={statusOptions}
          onSelect={(status) => onChange({ ...value, status })}
          label={statusPill[value.status]}
        />
      </View>
    </View>
  );
}
