import { CheckCircle2, Layers, TriangleAlert } from 'lucide-react-native';
import React from 'react';
import { Pressable } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';
import { cn } from '@/utils/cn';
import { timeAgo } from '@/utils/severity';

import type { Notification, NotificationType } from '../api/notifications.api';

interface Props {
  notification: Notification;
  onPress: (n: Notification) => void;
}

interface Visual {
  Icon: typeof TriangleAlert;
  tint: string;
  bg: string;
}

const ICON_BY_TYPE: Record<NotificationType, Visual> = {
  OUTBREAK: { Icon: TriangleAlert, tint: palette.status.danger, bg: '#fee2e2' },
  REPORT: { Icon: CheckCircle2, tint: palette.status.success, bg: '#ecfdf5' },
  WARNING: { Icon: TriangleAlert, tint: palette.status.warning, bg: '#fef3c7' },
  SYSTEM: { Icon: Layers, tint: palette.status.warning, bg: '#fef3c7' },
};

function pickIcon(type: NotificationType): Visual {
  return ICON_BY_TYPE[type] ?? ICON_BY_TYPE.SYSTEM;
}

export const NotificationCard = React.memo(function NotificationCard({ notification, onPress }: Props) {
  const { Icon, tint, bg } = pickIcon(notification.type);
  const isCritical = notification.type === 'OUTBREAK';
  const unread = !notification.read;

  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(notification)}>
      <View
        className={cn(
          'flex-row items-start gap-3 rounded-xl border bg-surface p-3',
          unread ? 'border-brand-100' : 'border-border',
        )}
        style={{
          borderLeftWidth: isCritical ? 3 : 1,
          borderLeftColor: isCritical ? palette.status.danger : undefined,
        }}
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: bg }}
        >
          <Icon size={18} color={tint} strokeWidth={2.2} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-bold text-text" numberOfLines={2}>
            {notification.title}
          </Text>
          {notification.body ? (
            <Text className="text-xs text-text-muted" numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
          <Text className="mt-1 text-[11px] text-text-subtle">
            {timeAgo(notification.createdAt)}
          </Text>
        </View>
        {isCritical ? <Chip label="High" tone="danger" /> : null}
        {unread ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: palette.brand[600],
              marginTop: 6,
            }}
          />
        ) : null}
      </View>
    </Pressable>
  );
});
