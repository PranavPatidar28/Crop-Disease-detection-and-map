import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, X } from 'lucide-react-native';
import { forwardRef } from 'react';

import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import type {
  ReportFilter,
  SeverityFilter,
  StatusFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { useTheme } from '@/hooks/use-theme';
import { Text, View } from '@/tw';

interface ReportFilterSheetProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
  matchingCount: number;
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
 * Bottom sheet that hosts the reports history severity + status filters. The
 * trigger buttons in ReportFilterBar open this; filtering itself stays
 * client-side and applies instantly as options are tapped.
 */
export const ReportFilterSheet = forwardRef<BottomSheetModal, ReportFilterSheetProps>(
  function ReportFilterSheet({ value, onChange, matchingCount }, ref) {
    const theme = useTheme();

    const dismiss = () => {
      // @ts-expect-error: ref provided by caller
      ref?.current?.dismiss();
    };

    const reset = () => onChange({ ...value, severity: 'all', status: 'all' });

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['55%']}
        backgroundStyle={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: '#efeae0',
          borderBottomWidth: 0,
        }}
        handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        )}
      >
        <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
          <Text className="text-xl font-bold text-text">Filters</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismiss}
            haptic="selection"
            pressedScale={0.9}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface"
          >
            <X size={18} color={theme.text} strokeWidth={2} />
          </PressableScale>
        </View>

        <BottomSheetView style={{ paddingHorizontal: 20, gap: 24, paddingBottom: 8 }}>
          <Section label="Severity">
            <View className="flex-row flex-wrap gap-2">
              {SEVERITY_OPTIONS.map((opt) => (
                <Chip
                  key={`sev-${opt.key}`}
                  label={opt.label}
                  active={value.severity === opt.key}
                  tone="brand"
                  onPress={() => onChange({ ...value, severity: opt.key })}
                />
              ))}
            </View>
          </Section>

          <Section label="Status">
            <View className="flex-row flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={`status-${opt.key}`}
                  label={opt.label}
                  active={value.status === opt.key}
                  tone="neutral"
                  onPress={() => onChange({ ...value, status: opt.key })}
                />
              ))}
            </View>
          </Section>
        </BottomSheetView>

        <View className="mt-auto flex-row gap-2 border-t border-border bg-surface-elevated px-5 py-4">
          <View className="flex-1">
            <Button label="Reset" variant="solid" size="md" onPress={reset} />
          </View>
          <View className="flex-[2]">
            <Button
              label={`Show ${matchingCount} ${matchingCount === 1 ? 'report' : 'reports'}`}
              variant="gradient"
              size="md"
              onPress={dismiss}
              leftSlot={<Check size={16} color="#fff" strokeWidth={2.4} />}
            />
          </View>
        </View>
      </BottomSheetModal>
    );
  },
);

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-[11px] font-medium uppercase tracking-wider text-text-subtle">
        {label}
      </Text>
      {children}
    </View>
  );
}
