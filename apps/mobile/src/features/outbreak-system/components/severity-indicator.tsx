import type { Severity } from '@/features/upload-report/types';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';
import { severityVisuals } from '@/utils/severity';

interface SeverityIndicatorProps {
  severity: Severity | null;
  /** Display variant. Compact = pill, expanded = pill + label. */
  variant?: 'compact' | 'expanded';
  /** Optional progress 0-1 toward the next severity threshold (for tooltips). */
  progress?: number;
  className?: string;
}

const labelFor = (severity: Severity | null): string => {
  const norm = (severity ?? '').toString().toUpperCase();
  if (norm === 'HIGH') return 'High severity';
  if (norm === 'MEDIUM') return 'Medium severity';
  return 'Low severity';
};

/**
 * Reusable severity badge. Used in lists, sheets, dashboard.
 * v7-introduced primitive; standalone (does not animate by itself).
 */
export function SeverityIndicator({
  severity,
  variant = 'expanded',
  progress,
  className,
}: SeverityIndicatorProps) {
  const visuals = severityVisuals(severity);
  const label = labelFor(severity);

  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 rounded-full',
        visuals.bgClass,
        variant === 'compact' ? 'px-2 py-1' : 'px-2.5 py-1.5',
        className,
      )}
    >
      <View
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: visuals.rawColor }}
      />
      {variant === 'expanded' ? (
        <Text
          className={cn(
            'text-[11px] font-semibold uppercase tracking-wider',
            visuals.textClass,
          )}
        >
          {label}
        </Text>
      ) : null}
      {typeof progress === 'number' ? (
        <View className="ml-1 h-1 w-8 overflow-hidden rounded-full bg-white/15">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.max(2, Math.min(100, progress * 100))}%`,
              backgroundColor: visuals.rawColor,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}
