import { SectionLabel } from '@/components/ui/section-label';
import { View } from '@/tw';

export function DayLabel({ children }: { children: string }) {
  return (
    <View className="px-1 pb-1 pt-3">
      <SectionLabel>{children}</SectionLabel>
    </View>
  );
}
