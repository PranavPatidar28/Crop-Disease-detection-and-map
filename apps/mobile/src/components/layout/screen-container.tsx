import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { ScrollView, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface ScreenContainerProps {
  children: ReactNode;
  /** When true, content scrolls vertically. Defaults to true. */
  scroll?: boolean;
  /** Disable horizontal padding. */
  noPadding?: boolean;
  /** Wraps content in a KeyboardAvoidingView. Useful for forms. */
  keyboardAware?: boolean;
  /** Safe area edges to respect. Defaults to all edges. */
  edges?: readonly Edge[];
  className?: string;
  contentClassName?: string;
  style?: ViewStyle;
}

const defaultEdges: readonly Edge[] = ['top', 'bottom', 'left', 'right'];

export function ScreenContainer({
  children,
  scroll = true,
  noPadding = false,
  keyboardAware = false,
  edges = defaultEdges,
  className,
  contentClassName,
  style,
}: ScreenContainerProps) {
  const padding = noPadding ? '' : 'px-4';

  const Inner = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('pb-8 gap-4', padding, contentClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 gap-4', padding, contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: 'transparent' }, style]}>
      <View className={cn('bg-bg flex-1', className)}>
        {keyboardAware ? (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {Inner}
          </KeyboardAvoidingView>
        ) : (
          Inner
        )}
      </View>
    </SafeAreaView>
  );
}
