import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { Text, View } from '@/tw';

/**
 * Numbered list of recommended actions, rendered in a glow card. Used by the
 * report detail screen and the map report sheet for the non-advisory branch.
 */
export function RecommendationsList({ items }: { items: string[] | null | undefined }) {
  const list = items ?? [];
  if (!list.length) return null;
  return (
    <Card variant="glow" padding="md">
      <SectionLabel>Recommended actions</SectionLabel>
      <View className="mt-2 gap-2">
        {list.slice(0, 5).map((item, i) => (
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
