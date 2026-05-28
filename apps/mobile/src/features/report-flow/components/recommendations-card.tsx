import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { Text, View } from '@/tw';

interface RecommendationsCardProps {
  items: string[];
  emphasized?: boolean;
}

export function RecommendationsCard({ items, emphasized = true }: RecommendationsCardProps) {
  if (!items.length) return null;
  return (
    <Card variant={emphasized ? 'glow' : 'flat'} padding="md">
      <SectionLabel>Recommended actions</SectionLabel>
      <View className="mt-2 gap-2">
        {items.slice(0, 5).map((item, i) => (
          <View key={`${i}-${item.slice(0, 20)}`} className="flex-row items-start gap-2.5">
            <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-success-tint">
              <Text className="text-[10px] font-bold text-success">{i + 1}</Text>
            </View>
            <Text className="flex-1 text-sm leading-5 text-text">{item}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
