import { GlassView } from 'expo-glass-effect';
import { AlertTriangle, Bell, Camera, Info } from 'lucide-react-native';
import { memo } from 'react';
import { Platform } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';
import { severityVisuals, timeAgo } from '@/utils/severity';

import type { Notification } from '../api/notifications.api';

interface NotificationCardProps {
  notification: Notification;
  onPress?: (n: Notification) => void;
}

const ICON_FOR_TYPE = {
  OUTBREAK: AlertTriangle,
  REPORT: Camera,
  WARNING: AlertTriangle,
  SYSTEM: Info,
} as const;

function NotificationCardImpl({ notification: n, onPress }: NotificationCardProps) {
  const theme = useTheme();
  const visuals = severityVisuals(n.severity);
  const Icon = ICON_FOR_TYPE[n.type] ?? Bell;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={n.title}
      onPress={() => onPress?.(n)}
      pressedScale={0.98}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : theme.surfaceElevated}
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <View
          className={cn(
            'flex-row items-start gap-3 rounded-[20px] border p-3',
            n.read ? 'border-white/10' : 'border-brand-500/30',
          )}
        >
          <View
            className={cn(
              'mt-0.5 h-10 w-10 items-center justify-center rounded-2xl',
              visuals.bgClass,
            )}
          >
            <Icon size={18} color={visuals.rawColor} strokeWidth={2.2} />
          </View>

          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center justify-between gap-2">
              <Text
                className={cn(
                  'flex-1 text-sm',
                  n.read ? 'font-medium text-text-muted' : 'font-semibold text-text',
                )}
                numberOfLines={1}
              >
                {n.title}
              </Text>
              {!n.read ? <View className="h-2 w-2 rounded-full bg-brand-500" /> : null}
            </View>
            <Text className="text-xs text-text-muted" numberOfLines={2}>
              {n.body}
            </Text>
            <Text className="mt-1 text-[11px] text-text-subtle">{timeAgo(n.createdAt)}</Text>
          </View>
        </View>
      </GlassView>
    </PressableScale>
  );
}

export const NotificationCard = memo(NotificationCardImpl);
