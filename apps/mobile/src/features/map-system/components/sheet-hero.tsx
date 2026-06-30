import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';

import { lightColors } from '@/theme/colors';
import { Text, View } from '@/tw';

interface SheetHeroProps {
  /** Small uppercase eyebrow label, e.g. "Active outbreak". */
  eyebrow: string;
  /** Main title, e.g. the disease name. */
  title: string;
  /** Big headline number, e.g. report count or confidence. */
  metric: string;
  /** Caption to the right of the metric, e.g. "reports in this zone". */
  metricCaption: string;
  /** Trailing element on the eyebrow row, e.g. a severity badge. */
  badge?: ReactNode;
}

/**
 * Deep-forest gradient hero card. The signature premium surface: leads with a
 * big bold number, with an eyebrow + title above it. Used at the top of the
 * map detail sheets.
 */
export function SheetHero({ eyebrow, title, metric, metricCaption, badge }: SheetHeroProps) {
  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: lightColors.forest,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.34,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[lightColors.forest, lightColors.forestEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        <View className="flex-row items-start justify-between">
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: lightColors.forestAccent,
            }}
          >
            {eyebrow}
          </Text>
          {badge}
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 4 }} numberOfLines={2}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#ffffff', lineHeight: 42 }}>
            {metric}
          </Text>
          <Text style={{ fontSize: 12, color: lightColors.forestAccent }}>{metricCaption}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
