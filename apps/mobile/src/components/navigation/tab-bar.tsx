import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { NotificationBadge } from '@/features/notifications/components/notification-badge';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import { TabBarIcon, type TabIconName } from './tab-bar-icon';

const ROUTE_TO_ICON: Record<string, TabIconName> = {
  index: 'house',
  map: 'map',
  upload: 'plus',
  notifications: 'bell',
  profile: 'user',
};

const ROUTE_TO_LABEL: Record<string, string> = {
  index: 'Home',
  map: 'Map',
  upload: 'Upload',
  notifications: 'Alerts',
  profile: 'Profile',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();

  return (
    <View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={
          Platform.OS === 'ios' ? `${theme.surfaceElevated}AA` : `${theme.surfaceElevated}F2`
        }
        style={{ borderRadius: 28, overflow: 'hidden' }}
      >
        <View className="flex-row items-center justify-between rounded-[28px] border border-white/10 px-2 py-2">
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const iconName = ROUTE_TO_ICON[route.name] ?? 'house';
            const label = ROUTE_TO_LABEL[route.name] ?? route.name;
            const isFab = iconName === 'plus';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            if (isFab) {
              return (
                <FabTab
                  key={route.key}
                  label={options.tabBarAccessibilityLabel ?? label}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            }

            const tint = isFocused ? theme.primary : theme.textSubtle;

            return (
              <RegularTab
                key={route.key}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                isFocused={isFocused}
                iconName={iconName}
                label={label}
                tint={tint}
                onPress={onPress}
                onLongPress={onLongPress}
                badge={
                  iconName === 'bell' && unreadCount > 0 ? (
                    <NotificationBadge count={unreadCount} size="sm" />
                  ) : null
                }
              />
            );
          })}
        </View>
      </GlassView>
    </View>
  );
}

interface RegularTabProps {
  accessibilityLabel: string;
  isFocused: boolean;
  iconName: TabIconName;
  label: string;
  tint: string;
  onPress: () => void;
  onLongPress: () => void;
  badge: React.ReactNode;
}

/**
 * Non-FAB tab. Picks up an animated underline-dot when focused and a
 * subtle icon scale-up. Both are spring-driven on the UI thread.
 */
function RegularTab({
  accessibilityLabel,
  isFocused,
  iconName,
  label,
  tint,
  onPress,
  onLongPress,
  badge,
}: RegularTabProps) {
  const focused = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focused.value = withSpring(isFocused ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.5,
    });
  }, [focused, isFocused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focused.value * 0.08 }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: focused.value,
    transform: [{ scaleX: 0.4 + focused.value * 0.6 }],
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      pressedScale={0.92}
      haptic="selection"
      className="flex-1 items-center justify-center gap-1 rounded-2xl px-2 py-2"
    >
      <Animated.View style={iconStyle}>
        <View>
          <TabBarIcon name={iconName} focused={isFocused} color={tint} />
          {badge ? (
            <View
              style={{
                position: 'absolute',
                top: -4,
                right: -8,
              }}
            >
              {badge}
            </View>
          ) : null}
        </View>
      </Animated.View>
      <Text
        className="text-[10px] font-semibold"
        style={{ color: tint }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 2,
            width: 16,
            height: 3,
            borderRadius: 999,
            backgroundColor: tint,
          },
          dotStyle,
        ]}
      />
    </PressableScale>
  );
}

interface FabTabProps {
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * The middle "Upload" FAB. Lifts above the bar with a soft brand glow and a
 * heavier press haptic since it triggers the primary action of the app.
 */
function FabTab({ label, isFocused, onPress, onLongPress }: FabTabProps) {
  const focusedV = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusedV.value = withTiming(isFocused ? 1 : 0, { duration: 220 });
  }, [focusedV, isFocused]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + focusedV.value * 0.08 }],
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onPress();
      }}
      onLongPress={onLongPress}
      // Disable internal haptic — we fire a heavier one manually above on full press.
      haptic="none"
      pressedScale={0.92}
      style={{
        transform: [{ translateY: -22 }],
      }}
    >
      <Animated.View style={ringStyle}>
        <View
          className="h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-bg"
          style={{
            shadowColor: palette.brand[500],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 14,
            elevation: 12,
          }}
        >
          <LinearGradient
            colors={[palette.brand[400], palette.brand[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
          {/* Soft top highlight for depth */}
          <LinearGradient
            colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '55%' }}
          />
          <TabBarIcon name="plus" focused color="#ffffff" size={28} />
        </View>
      </Animated.View>
    </PressableScale>
  );
}
