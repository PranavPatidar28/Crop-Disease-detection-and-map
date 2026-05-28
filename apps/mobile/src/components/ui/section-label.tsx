import { Text } from '@/tw';
import { cn } from '@/utils/cn';

export interface SectionLabelProps {
  children: string;
  className?: string;
}

/** Uppercase, tracked, brand-teal label for hero card eyebrows and section eyebrows. */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <Text
      className={cn(
        'text-[11px] font-bold uppercase tracking-[1.4px] text-brand-700',
        className,
      )}
    >
      {children}
    </Text>
  );
}
