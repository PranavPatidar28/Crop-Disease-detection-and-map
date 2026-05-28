import * as Haptics from 'expo-haptics';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react-native';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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
 * Lightweight toast provider — anchored at the bottom of the screen, light
 * Soft Sage card styling with tone-tinted left border and surface. Use
 * `useToast()` from any component to show transient confirmations, error
 * nudges, or info messages.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
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
  }, []);

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

interface ToneStyle {
  /** Left-border accent + icon color. */
  tint: string;
  /** Outer border color. */
  border: string;
  /** Title / message color. */
  text: string;
  /** Surface background color. */
  bg: string;
}

const TONE_STYLES: Record<ToastTone, ToneStyle> = {
  success: {
    tint: '#047857',
    border: '#a7f3d0',
    text: '#047857',
    bg: '#ecfdf5',
  },
  error: {
    tint: '#b91c1c',
    border: '#fecaca',
    text: '#b91c1c',
    bg: '#fee2e2',
  },
  warning: {
    tint: '#92400e',
    border: '#fde68a',
    text: '#92400e',
    bg: '#fef3c7',
  },
  info: {
    tint: '#1d4ed8',
    border: '#bfdbfe',
    text: '#1d4ed8',
    bg: '#dbeafe',
  },
};

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: CircleAlert,
  info: Info,
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
  const tone: ToastTone = toast.tone ?? 'info';
  const styles = TONE_STYLES[tone];
  const Icon = TONE_ICON[tone];
  const duration = toast.durationMs ?? DEFAULT_DURATION;

  useEffect(() => {
    if (duration <= 0) return undefined;
    const id = setTimeout(() => onDismiss(toast.id), duration);
    return () => clearTimeout(id);
  }, [toast.id, duration, onDismiss]);

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          backgroundColor: styles.bg,
          borderColor: styles.border,
          borderWidth: 1,
          borderLeftWidth: 4,
          borderLeftColor: styles.tint,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#0f172a',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View style={{ marginTop: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={styles.tint} strokeWidth={2.4} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {toast.title ? (
            <Text style={{ color: styles.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
              {toast.title}
            </Text>
          ) : null}
          <Text style={{ color: styles.text, fontSize: 13, fontWeight: '600' }} numberOfLines={3}>
            {toast.message}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => onDismiss(toast.id)}
          hitSlop={8}
          style={{
            height: 24,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
          }}
        >
          <X size={14} color={styles.text} strokeWidth={2} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
