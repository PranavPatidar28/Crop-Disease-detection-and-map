import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/ui/pressable-scale';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';
import type { NotificationType } from '../api/notifications.api';

export type NotificationFilterValue = 'all' | 'unread' | NotificationType;

interface NotificationFilterProps {
  value: NotificationFilterValue;
  onChange: (next: NotificationFilterValue) => void;
}

const FILTERS: { id: NotificationFilterValue; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'OUTBREAK', label: 'Outbreaks' },
  { id: 'REPORT', label: 'Reports' },
  { id: 'WARNING', label: 'Warnings' },
  { id: 'SYSTEM', label: 'System' },
];

export function NotificationFilter({ value, onChange }: NotificationFilterProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {FILTERS.map((f) => (
        <FilterPill
          key={f.id}
          label={f.label}
          selected={value === f.id}
          onPress={() => onChange(f.id)}
        />
      ))}
    </View>
  );
}

function FilterPill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  // Spring the pill on selection — communicates "filter just applied" without
  // needing a banner or toast.
  const sel = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    sel.value = withSpring(selected ? 1 : 0, {
      damping: 16,
      stiffness: 240,
      mass: 0.5,
    });
  }, [sel, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + sel.value * 0.04 }],
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Filter: ${label}`}
      onPress={onPress}
      pressedScale={0.93}
      haptic="selection"
    >
      <Animated.View style={animatedStyle}>
        <View
          className={cn(
            'rounded-full border px-3 py-1.5',
            selected ? 'border-brand-500 bg-brand-500/15' : 'border-border bg-surface',
          )}
        >
          <Text
            className={cn(
              'text-xs font-semibold',
              selected ? 'text-brand-300' : 'text-text-muted',
            )}
          >
            {label}
          </Text>
        </View>
      </Animated.View>
    </PressableScale>
  );
}
