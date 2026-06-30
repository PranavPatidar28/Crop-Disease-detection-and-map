import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, useWindowDimensions, type View as RNView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { shadows } from '@/theme/shadows';
import { ScrollView, Text, View } from '@/tw';

import {
  computeAnchorRect,
  estimateContentHeight,
  type AnchorRect,
} from './anchor-position';
import { DropdownOptionRow } from './dropdown-option';
import { DropdownTrigger } from './dropdown-trigger';
import {
  flattenItems,
  isSectioned,
  type DropdownItems,
  type DropdownMode,
  type DropdownOption,
  type DropdownSection,
  type Align,
  type TriggerVariant,
} from './types';

export interface DropdownProps<T = string> {
  items: DropdownItems<T>;
  mode?: DropdownMode;
  /** Select mode: current value (drives check + trigger text). */
  value?: T | null;
  onSelect: (value: T) => void;
  /** Custom trigger element; overrides the built-in trigger. */
  trigger?: ReactNode;
  triggerVariant?: TriggerVariant;
  label?: string;
  placeholder?: string;
  align?: Align;
  disabled?: boolean;
  maxPanelHeight?: number;
  /** Field variant only. */
  error?: string;
  className?: string;
  testID?: string;
}

export function Dropdown<T = string>({
  items,
  mode = 'select',
  value = null,
  onSelect,
  trigger,
  triggerVariant = 'field',
  label,
  placeholder = 'Select…',
  align = 'start',
  disabled = false,
  maxPanelHeight = 320,
  error,
  className,
  testID,
}: DropdownProps<T>) {
  const window = useWindowDimensions();
  const anchorRef = useRef<RNView>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<AnchorRect | null>(null);
  const progress = useSharedValue(0);

  const flat = useMemo(() => flattenItems(items), [items]);
  const selectedOption = useMemo(
    () => (value == null ? undefined : flat.find((o) => o.value === value)),
    [flat, value],
  );

  const contentHeight = useMemo(() => {
    const rowsWithDescription = flat.filter((o) => o.description).length;
    const sectionHeaderCount = isSectioned(items)
      ? (items as DropdownSection<T>[]).filter((s) => s.label).length
      : 0;
    return estimateContentHeight({
      rowCount: flat.length,
      rowsWithDescription,
      sectionHeaderCount,
    });
  }, [flat, items]);

  const close = useCallback(() => {
    // Fade the panel out, then unmount the Modal after the close duration.
    // eslint-disable-next-line react-hooks/immutability -- reanimated shared value is mutable on purpose
    progress.value = withTiming(0, { duration: 110 });
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 110);
  }, [progress]);

  const openPopover = useCallback(() => {
    if (disabled || flat.length === 0) {
      if (flat.length === 0 && __DEV__) {
        console.warn('[Dropdown] opened with empty items; nothing to show.');
      }
      return;
    }
    anchorRef.current?.measureInWindow((x, y, w, h) => {
      if (w === 0 && h === 0) return; // trigger not laid out / unmounted
      if (closeTimer.current) clearTimeout(closeTimer.current);
      const next = computeAnchorRect({
        trigger: { x, y, width: w, height: h },
        window: { width: window.width, height: window.height },
        contentHeight,
        align,
        maxPanelHeight,
        triggerVariant: trigger ? 'icon' : triggerVariant,
      });
      setRect(next);
      setOpen(true);
      progress.value = 0;
      progress.value = withTiming(1, { duration: 140 });
    });
  }, [
    disabled,
    flat.length,
    window.width,
    window.height,
    contentHeight,
    align,
    maxPanelHeight,
    trigger,
    triggerVariant,
    progress,
  ]);

  const handlePick = useCallback(
    (optionValue: T) => {
      onSelect(optionValue);
      close();
    },
    [onSelect, close],
  );

  const panelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const displayText = selectedOption?.label ?? placeholder;
  const hasValue = !!selectedOption;
  const showCheck = mode === 'select';

  return (
    <>
      <View ref={anchorRef} collapsable={false} className={className}>
        {trigger ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open, disabled }}
            disabled={disabled}
            onPress={openPopover}
            testID={testID}
          >
            {trigger}
          </Pressable>
        ) : (
          <DropdownTrigger
            variant={triggerVariant}
            label={label}
            displayText={displayText}
            hasValue={hasValue}
            icon={selectedOption?.icon}
            expanded={open}
            disabled={disabled}
            error={error}
            testID={testID}
            onPress={openPopover}
          />
        )}
      </View>

      <Modal
        transparent
        statusBarTranslucent
        animationType="none"
        visible={open}
        onRequestClose={close}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            accessibilityViewIsModal
            style={{ flex: 1 }}
            onPress={close}
          >
            {rect ? (
              <Animated.View
                pointerEvents="box-none"
                style={[
                  {
                    position: 'absolute',
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    maxHeight: rect.height,
                    // Scale grows from the edge nearest the trigger.
                    transformOrigin: rect.transformOrigin === 'top' ? 'center top' : 'center bottom',
                  },
                  panelStyle,
                ]}
              >
                {/* Stop propagation so taps inside the panel don't close it. */}
                <Pressable onPress={() => undefined}>
                  <View
                    className="overflow-hidden rounded-xl border border-border bg-surface p-1.5"
                    style={shadows.cardHover}
                  >
                    <ScrollView
                      bounces={false}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ gap: 2 }}
                    >
                      <DropdownItemList
                        items={items}
                        value={value}
                        showCheck={showCheck}
                        onPick={handlePick}
                      />
                    </ScrollView>
                  </View>
                </Pressable>
              </Animated.View>
            ) : null}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

interface DropdownItemListProps<T> {
  items: DropdownItems<T>;
  value: T | null;
  showCheck: boolean;
  onPick: (value: T) => void;
}

function DropdownItemList<T>({ items, value, showCheck, onPick }: DropdownItemListProps<T>) {
  if (isSectioned(items)) {
    return (
      <>
        {items.map((section, si) => (
          <View key={`section-${si}`} className={si > 0 ? 'mt-1 border-t border-border pt-1' : undefined}>
            {section.label ? (
              <Text className="px-3 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-text-subtle">
                {section.label}
              </Text>
            ) : null}
            {section.options.map((option) => (
              <DropdownOptionRow
                key={String(option.value)}
                option={option}
                selected={option.value === value}
                showCheck={showCheck}
                onPress={() => onPick(option.value)}
              />
            ))}
          </View>
        ))}
      </>
    );
  }

  return (
    <>
      {(items as DropdownOption<T>[]).map((option) => (
        <DropdownOptionRow
          key={String(option.value)}
          option={option}
          selected={option.value === value}
          showCheck={showCheck}
          onPress={() => onPick(option.value)}
        />
      ))}
    </>
  );
}
