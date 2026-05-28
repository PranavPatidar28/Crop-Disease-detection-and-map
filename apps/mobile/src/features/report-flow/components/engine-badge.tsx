import { Cloud, Pencil, Smartphone } from 'lucide-react-native';

import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

import type { AnalysisEngine } from '../types';
import { ENGINE_COPY } from '../use-report-flow';

interface EngineBadgeProps {
  engine: AnalysisEngine;
  confidence?: number | null;
}

const ICONS = {
  cloud: Cloud,
  'on-device': Smartphone,
  manual: Pencil,
} as const;

export function EngineBadge({ engine, confidence }: EngineBadgeProps) {
  const Icon = ICONS[engine];
  const pct =
    confidence !== null && confidence !== undefined
      ? `${Math.round(confidence * 100)}%`
      : null;

  return (
    <View
      className="flex-row items-center gap-1 self-start rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1"
    >
      <Icon size={11} color={palette.brand[700]} strokeWidth={2.4} />
      <Text className="text-[11px] font-bold text-brand-700">
        {ENGINE_COPY[engine].badge}
        {pct ? ` · ${pct}` : ''}
      </Text>
    </View>
  );
}
