import { GlassView } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastInput {
  id?: string;
  tone?: ToastTone;
  title?: string;
  message: string;
  /** Auto-dismiss after this many ms. Default 3000. 0 = no auto-dismiss. */
  durationMs?: number;
}

interface Toast extends ToastInput {
  id: string;
}

interface ToastContextValue {
  show: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 3000;

/**
 * Lightweight toast provider — anchored at the bottom of the screen, glass card
 * styling, severity-tinted icons. Use `useToast()` from any component to show
 * transient confirmations, error nudges, or info messages.
 *
 * Picked over a 3rd-party toast lib because we already have all the pieces
 * (glass, reanimated, lucide). Total cost: ~120 lines.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => {
        const next = [...prev.filter((t) => t.id !== id), { ...input, id }];
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });
      // Tactile feedback on success / error.
      if (input.tone === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      } else if (input.tone === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      } else if (input.tone === 'warning') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      }
      return id;
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TONE_VISUALS: Record<ToastTone, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: palette.brand[400] },
  error: { icon: CircleAlert, color: '#ef4444' },
  warning: { icon: CircleAlert, color: '#f59e0b' },
  info: { icon: Info, color: '#3b82f6' },
};

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <SafeAreaView
      edges={['bottom']}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9998,
      }}
    >
      <View pointerEvents="box-none" style={{ gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </View>
    </SafeAreaView>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const theme = useTheme();
  const tone = toast.tone ?? 'info';
  const { icon: Icon, color } = TONE_VISUALS[tone];
  const duration = toast.durationMs ?? DEFAULT_DURATION;

  useEffect(() => {
    if (duration <= 0) return undefined;
    const id = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(id);
  }, [toast.id, duration, onDismiss]);

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)}>
      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? `${theme.surfaceElevated}DD` : `${theme.surfaceElevated}EE`}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        <View
          className="flex-row items-start gap-3 rounded-2xl border border-white/15 px-3 py-3"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <View
            className="mt-0.5 h-9 w-9 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}22` }}
          >
            <Icon size={18} color={color} strokeWidth={2.4} />
          </View>
          <View className="flex-1 gap-0.5">
            {toast.title ? (
              <Text className="text-sm font-semibold text-text" numberOfLines={1}>
                {toast.title}
              </Text>
            ) : null}
            <Text className="text-xs text-text-muted" numberOfLines={3}>
              {toast.message}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            onPress={() => onDismiss(toast.id)}
            hitSlop={8}
            className="h-7 w-7 items-center justify-center rounded-full bg-surface"
          >
            <X size={14} color={theme.textMuted} strokeWidth={2} />
          </Pressable>
        </View>
      </GlassView>
    </Animated.View>
  );
}
