import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/chip';

import type { NotificationType } from '../api/notifications.api';

export type NotificationFilterValue = 'all' | 'unread' | NotificationType;

interface Props {
  value: NotificationFilterValue;
  onChange: (next: NotificationFilterValue) => void;
}

const OPTIONS: { value: NotificationFilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'OUTBREAK', label: 'Outbreaks' },
  { value: 'REPORT', label: 'Reports' },
  { value: 'WARNING', label: 'Warnings' },
  { value: 'SYSTEM', label: 'System' },
];

export function NotificationFilter({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {OPTIONS.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          active={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </ScrollView>
  );
}
