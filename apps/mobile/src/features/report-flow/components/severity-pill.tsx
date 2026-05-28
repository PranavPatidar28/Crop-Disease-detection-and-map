import { Chip } from '@/components/ui/chip';
import type { Severity } from '@/features/upload-report/types';

const TONE: Record<Severity, 'success' | 'warning' | 'danger'> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

const LABEL: Record<Severity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export function SeverityPill({ severity }: { severity: Severity }) {
  return <Chip label={`Severity: ${LABEL[severity]}`} tone={TONE[severity]} />;
}
