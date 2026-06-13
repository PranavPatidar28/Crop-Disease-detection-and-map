# Dropdown Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable anchored-popover `Dropdown` component (single-select + action-menu) that renders above all UI via a transparent RN `Modal`, then adopt it at the reports overflow menu and the reports filter Severity/Status pills.

**Architecture:** A self-contained component under `src/components/ui/dropdown/`. The popover renders inside a transparent React Native `Modal` (OS-level layer → always on top, even over bottom sheets). The trigger is measured with `measureInWindow`; a pure `computeAnchorRect` function decides placement (below/above, edge-clamped). Pure positioning logic lives in an RN-free file so it is unit-testable under the existing jest config.

**Tech Stack:** React Native + Expo, `react-native-css` (`@/tw`), `react-native-reanimated`, `lucide-react-native`, `expo-haptics` (via `PressableScale`), jest (babel-jest, node env, `*.test.ts` only).

---

## File Structure

```
src/components/ui/dropdown/
  anchor-position.ts        # PURE (no RN imports): computeAnchorRect + estimateContentHeight + types. Unit-tested.
  anchor-position.test.ts   # unit tests for the pure logic
  types.ts                  # DropdownOption, DropdownSection, mode/variant/align types (imports LucideIcon type)
  dropdown-option.tsx       # one option row (icon, label, description, check, destructive, disabled)
  dropdown-trigger.tsx      # built-in trigger variants: field / pill / icon
  dropdown.tsx              # <Dropdown> — public component: trigger + state + Modal popover + positioning
  index.ts                  # barrel export
```

Modified files:
- `src/components/ui/index.ts` — re-export the dropdown barrel.
- `src/app/reports/[id].tsx` — replace `ActionSheetIOS`/`Alert` menu with `<Dropdown mode="menu">`.
- `src/features/disease-analysis/components/report-filter-bar.tsx` — replace the two `FilterTrigger` pills with `<Dropdown triggerVariant="pill">`.
- `src/app/(app)/reports.tsx` — remove the `matchingCount` prop wiring.

Deleted files:
- `src/features/disease-analysis/components/report-filter-sheet.tsx` — superseded by dropdowns.

Conventions (match exactly): import `View`/`Text` from `@/tw`; compose classes with `cn`; colors from `palette`/`useTheme()`; all tap surfaces wrap `PressableScale`; icons from `lucide-react-native`; `forwardRef` only where a ref is needed.

---

## Task 1: Pure positioning logic + types

**Files:**
- Create: `src/components/ui/dropdown/anchor-position.ts`
- Test: `src/components/ui/dropdown/anchor-position.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/dropdown/anchor-position.test.ts`:

```ts
import {
  computeAnchorRect,
  estimateContentHeight,
  type AnchorInput,
} from './anchor-position';

const base: AnchorInput = {
  trigger: { x: 40, y: 100, width: 120, height: 40 },
  window: { width: 390, height: 844 },
  contentHeight: 200,
  align: 'start',
  maxPanelHeight: 320,
  triggerVariant: 'field',
};

describe('computeAnchorRect', () => {
  it('places the panel below the trigger when there is room', () => {
    const r = computeAnchorRect(base);
    expect(r.placement).toBe('below');
    expect(r.transformOrigin).toBe('top');
    // 100 + 40 + gap(6)
    expect(r.top).toBe(146);
    expect(r.height).toBe(200);
  });

  it('flips above when there is no room below but room above', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 700, width: 120, height: 40 },
    });
    expect(r.placement).toBe('above');
    expect(r.transformOrigin).toBe('bottom');
    // top = triggerY(700) - gap(6) - height(200)
    expect(r.top).toBe(494);
  });

  it('picks the larger side and clamps height when neither side fits', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 360, width: 120, height: 40 },
      contentHeight: 1000,
      maxPanelHeight: 1000,
      window: { width: 390, height: 700 },
    });
    // spaceBelow = 700 - 400 - 8 - 6 = 286; spaceAbove = 360 - 8 - 6 = 346 → above larger
    expect(r.placement).toBe('above');
    expect(r.height).toBe(346);
    expect(r.top).toBe(6); // 360 - 6 - 346, clamped not needed
  });

  it('aligns to the trigger left edge for align=start', () => {
    const r = computeAnchorRect(base);
    expect(r.left).toBe(40);
    // field width = max(triggerWidth 120, MIN_FIELD_WIDTH 180) = 180
    expect(r.width).toBe(180);
  });

  it('uses a minimum width of 180 for field/pill triggers', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 40, y: 100, width: 90, height: 40 },
    });
    expect(r.width).toBe(180);
  });

  it('uses a fixed intrinsic width for icon triggers', () => {
    const r = computeAnchorRect({ ...base, triggerVariant: 'icon' });
    expect(r.width).toBe(220);
  });

  it('right-aligns the panel to the trigger right edge for align=end', () => {
    const r = computeAnchorRect({
      ...base,
      align: 'end',
      triggerVariant: 'icon',
      trigger: { x: 300, y: 100, width: 40, height: 40 },
    });
    // right edge = 340; left = 340 - 220 = 120
    expect(r.left).toBe(120);
  });

  it('clamps the panel within the left screen margin', () => {
    const r = computeAnchorRect({
      ...base,
      triggerVariant: 'icon',
      align: 'end',
      trigger: { x: 10, y: 100, width: 40, height: 40 },
    });
    // unclamped left = 50 - 220 = -170 → clamp to margin 8
    expect(r.left).toBe(8);
  });

  it('clamps the panel within the right screen margin', () => {
    const r = computeAnchorRect({
      ...base,
      trigger: { x: 320, y: 100, width: 120, height: 40 },
    });
    // width = max(120,180)=180; unclamped left=320; max left = 390-8-180=202 → clamp 202
    expect(r.left).toBe(202);
  });
});

describe('estimateContentHeight', () => {
  it('sums padding + rows', () => {
    // pad 12 + 3 rows * 44
    expect(estimateContentHeight({ rowCount: 3, rowsWithDescription: 0, sectionHeaderCount: 0 })).toBe(144);
  });

  it('adds extra height for descriptions and section headers', () => {
    // 12 + 2*44 + 1*18 + 1*30 = 148
    expect(estimateContentHeight({ rowCount: 2, rowsWithDescription: 1, sectionHeaderCount: 1 })).toBe(148);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- anchor-position` (from `apps/mobile`)
Expected: FAIL — `Cannot find module './anchor-position'`.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/dropdown/anchor-position.ts`:

```ts
/**
 * Pure popover positioning math for <Dropdown>. NO react-native imports — this
 * file must stay runtime-free so it is unit-testable under the repo's
 * babel-jest (node) config, which only matches *.test.ts.
 */

export type Placement = 'below' | 'above';
export type Align = 'start' | 'end';
export type TriggerVariant = 'field' | 'pill' | 'icon';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnchorInput {
  /** Trigger position in window coordinates (from measureInWindow). */
  trigger: { x: number; y: number; width: number; height: number };
  window: { width: number; height: number };
  /** Estimated content height of the panel (see estimateContentHeight). */
  contentHeight: number;
  align: Align;
  maxPanelHeight: number;
  triggerVariant: TriggerVariant;
  /** Screen edge margin. Default 8. */
  margin?: number;
  /** Gap between trigger and panel. Default 6. */
  gap?: number;
}

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  placement: Placement;
  transformOrigin: 'top' | 'bottom';
}

const MIN_FIELD_WIDTH = 180;
const ICON_PANEL_WIDTH = 220;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeAnchorRect(input: AnchorInput): AnchorRect {
  const { trigger, window, align, maxPanelHeight, triggerVariant } = input;
  const margin = input.margin ?? 8;
  const gap = input.gap ?? 6;

  // Width
  let width =
    triggerVariant === 'icon'
      ? ICON_PANEL_WIDTH
      : Math.max(trigger.width, MIN_FIELD_WIDTH);
  width = Math.min(width, window.width - margin * 2);

  // Vertical placement
  const desired = Math.min(input.contentHeight, maxPanelHeight);
  const spaceBelow = window.height - (trigger.y + trigger.height) - margin - gap;
  const spaceAbove = trigger.y - margin - gap;

  let placement: Placement;
  let height: number;
  let top: number;

  if (desired <= spaceBelow) {
    placement = 'below';
    height = desired;
    top = trigger.y + trigger.height + gap;
  } else if (desired <= spaceAbove) {
    placement = 'above';
    height = desired;
    top = trigger.y - gap - height;
  } else if (spaceBelow >= spaceAbove) {
    placement = 'below';
    height = Math.max(0, spaceBelow);
    top = trigger.y + trigger.height + gap;
  } else {
    placement = 'above';
    height = Math.max(0, spaceAbove);
    top = trigger.y - gap - height;
  }

  // Horizontal placement
  let left = align === 'end' ? trigger.x + trigger.width - width : trigger.x;
  left = clamp(left, margin, window.width - margin - width);

  return {
    top,
    left,
    width,
    height,
    placement,
    transformOrigin: placement === 'below' ? 'top' : 'bottom',
  };
}

export interface ContentEstimate {
  rowCount: number;
  rowsWithDescription: number;
  sectionHeaderCount: number;
}

const PANEL_VPAD = 12;
const ROW_HEIGHT = 44;
const DESCRIPTION_EXTRA = 18;
const SECTION_HEADER = 30;

/** Deterministic height estimate so placement avoids a two-pass layout flicker. */
export function estimateContentHeight(e: ContentEstimate): number {
  return (
    PANEL_VPAD +
    e.rowCount * ROW_HEIGHT +
    e.rowsWithDescription * DESCRIPTION_EXTRA +
    e.sectionHeaderCount * SECTION_HEADER
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- anchor-position`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dropdown/anchor-position.ts src/components/ui/dropdown/anchor-position.test.ts
git commit -m "feat(dropdown): add pure anchor-position logic with tests"
```

---

## Task 2: Public types

**Files:**
- Create: `src/components/ui/dropdown/types.ts`

- [ ] **Step 1: Write the types**

Create `src/components/ui/dropdown/types.ts`:

```ts
import type { LucideIcon } from 'lucide-react-native';

import type { Align, TriggerVariant } from './anchor-position';

export type { Align, TriggerVariant };

export type DropdownMode = 'select' | 'menu';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  /** Secondary line under the label. */
  description?: string;
  /** Leading icon. */
  icon?: LucideIcon;
  /** Red label/icon — for destructive actions in menu mode. */
  destructive?: boolean;
  /** Greyed, non-tappable. */
  disabled?: boolean;
}

export interface DropdownSection<T = string> {
  /** Small uppercase section header. */
  label?: string;
  options: DropdownOption<T>[];
}

export type DropdownItems<T = string> =
  | DropdownOption<T>[]
  | DropdownSection<T>[];

/** Narrowing helper: did the caller pass sectioned items? */
export function isSectioned<T>(
  items: DropdownItems<T>,
): items is DropdownSection<T>[] {
  return items.length > 0 && 'options' in items[0];
}

/** Flatten items to a single option list (sections concatenated). */
export function flattenItems<T>(items: DropdownItems<T>): DropdownOption<T>[] {
  return isSectioned(items)
    ? items.flatMap((s) => s.options)
    : (items as DropdownOption<T>[]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` (from `apps/mobile`)
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown/types.ts
git commit -m "feat(dropdown): add public types and item helpers"
```

---

## Task 3: Option row component

**Files:**
- Create: `src/components/ui/dropdown/dropdown-option.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/dropdown/dropdown-option.tsx`:

```tsx
import { Check } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import type { DropdownOption } from './types';

interface DropdownOptionRowProps<T> {
  option: DropdownOption<T>;
  selected: boolean;
  /** Hide the trailing check (menu mode). */
  showCheck: boolean;
  onPress: () => void;
}

export function DropdownOptionRow<T>({
  option,
  selected,
  showCheck,
  onPress,
}: DropdownOptionRowProps<T>) {
  const { label, description, icon: Icon, destructive, disabled } = option;

  const iconColor = destructive
    ? palette.status.danger
    : palette.brand[600];

  return (
    <PressableScale
      accessibilityRole={showCheck ? 'button' : 'menuitem'}
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic={disabled ? 'none' : 'selection'}
      pressedScale={0.98}
    >
      <View
        className={cn(
          'min-h-11 flex-row items-center gap-3 rounded-lg px-3 py-2.5',
          selected && showCheck && 'bg-brand-50',
          disabled && 'opacity-50',
        )}
      >
        {Icon ? (
          <Icon size={18} color={iconColor} strokeWidth={2.2} />
        ) : null}

        <View className="flex-1">
          <Text
            className={cn(
              'text-sm font-bold',
              destructive ? 'text-danger' : 'text-text',
            )}
            numberOfLines={1}
          >
            {label}
          </Text>
          {description ? (
            <Text className="text-xs text-text-subtle" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>

        {showCheck && selected ? (
          <Check size={16} color={palette.brand[600]} strokeWidth={2.6} />
        ) : null}
      </View>
    </PressableScale>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown/dropdown-option.tsx
git commit -m "feat(dropdown): add option row component"
```

---

## Task 4: Built-in trigger component

**Files:**
- Create: `src/components/ui/dropdown/dropdown-trigger.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/dropdown/dropdown-trigger.tsx`:

```tsx
import { ChevronDown } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

import type { TriggerVariant } from './types';

interface DropdownTriggerProps {
  variant: TriggerVariant;
  /** Field label (uppercase) / pill text. */
  label?: string;
  /** Resolved display text (selected option label or placeholder). */
  displayText: string;
  /** Whether a value is currently set (drives pill active state). */
  hasValue: boolean;
  /** Leading icon for the selected value (field/pill). */
  icon?: LucideIcon;
  expanded: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  testID?: string;
  onPress: () => void;
}

export function DropdownTrigger({
  variant,
  label,
  displayText,
  hasValue,
  icon: Icon,
  expanded,
  disabled,
  error,
  className,
  testID,
  onPress,
}: DropdownTriggerProps) {
  const theme = useTheme();
  const hasError = !!error;

  if (variant === 'pill') {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label ?? displayText}
        accessibilityState={{ expanded, disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        haptic="selection"
        pressedScale={0.97}
        testID={testID}
        className={cn('flex-1', className)}
      >
        <View
          className={cn(
            'flex-row items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5',
            hasValue ? 'border-brand-600 bg-brand-600' : 'border-border bg-surface',
            disabled && 'opacity-50',
          )}
        >
          {Icon ? (
            <Icon
              size={14}
              color={hasValue ? '#fff' : palette.brand[600]}
              strokeWidth={2.2}
            />
          ) : null}
          <Text
            className={cn('text-[13px] font-bold', hasValue ? 'text-white' : 'text-text')}
            numberOfLines={1}
          >
            {/* Pill shows the selected value's label, or the category name when empty. */}
            {hasValue ? displayText : (label ?? displayText)}
          </Text>
          <ChevronDown size={14} color={hasValue ? '#fff' : theme.textMuted} strokeWidth={2.2} />
        </View>
      </PressableScale>
    );
  }

  // variant === 'field'
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label ?? displayText}
      accessibilityState={{ expanded, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      haptic="selection"
      pressedScale={0.98}
      testID={testID}
      className={cn('gap-1.5', className)}
    >
      {label ? (
        <Text className="text-xs font-bold uppercase tracking-[1.4px] text-text-subtle">
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          'h-12 flex-row items-center rounded-xl border bg-surface px-3',
          hasError ? 'border-danger' : expanded ? 'border-2 border-brand-600' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        {Icon ? (
          <View className="mr-2">
            <Icon size={18} color={palette.brand[600]} strokeWidth={2.2} />
          </View>
        ) : null}
        <Text
          className={cn('flex-1 text-base', hasValue ? 'text-text' : 'text-text-faint')}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <ChevronDown size={18} color={theme.textMuted} strokeWidth={2.2} />
      </View>
      {hasError ? <Text className="text-xs font-medium text-danger">{error}</Text> : null}
    </PressableScale>
  );
}
```

Note: the `icon` variant is NOT handled here — when `triggerVariant="icon"` or a custom `trigger` is supplied, `Dropdown` wraps the caller-provided node directly (Task 5). This component only renders the `field` and `pill` built-ins.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown/dropdown-trigger.tsx
git commit -m "feat(dropdown): add built-in field/pill trigger"
```

---

## Task 5: Main Dropdown component

**Files:**
- Create: `src/components/ui/dropdown/dropdown.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/ui/dropdown/dropdown.tsx`:

```tsx
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, useWindowDimensions, type View as RNView } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
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
    progress.value = withTiming(0, { duration: 110 });
    setTimeout(() => setOpen(false), 110);
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

  const displayText = selectedOption?.label ?? placeholder;
  const hasValue = !!selectedOption;
  const showCheck = mode === 'select';

  return (
    <>
      <View ref={anchorRef} collapsable={false} className={trigger ? className : undefined}>
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
            className={className}
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
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(110)}
          style={{ flex: 1 }}
        >
          <Pressable
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
        </Animated.View>
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
```

Note: `Text` is used in `DropdownItemList` — add it to the `@/tw` import. Update the import line to:

```tsx
import { ScrollView, Text, View } from '@/tw';
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If `Text` is reported unused/missing, confirm the `@/tw` import includes `ScrollView, Text, View`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown/dropdown.tsx
git commit -m "feat(dropdown): add main Dropdown component with Modal popover"
```

---

## Task 6: Barrel exports

**Files:**
- Create: `src/components/ui/dropdown/index.ts`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create the dropdown barrel**

Create `src/components/ui/dropdown/index.ts`:

```ts
export { Dropdown, type DropdownProps } from './dropdown';
export type {
  DropdownItems,
  DropdownMode,
  DropdownOption,
  DropdownSection,
  Align as DropdownAlign,
  TriggerVariant as DropdownTriggerVariant,
} from './types';
```

- [ ] **Step 2: Re-export from the ui barrel**

Modify `src/components/ui/index.ts` — add after the `./chip` line:

```ts
export * from './dropdown';
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dropdown/index.ts src/components/ui/index.ts
git commit -m "feat(dropdown): add barrel exports"
```

---

## Task 7: Adopt in reports overflow menu

**Files:**
- Modify: `src/app/reports/[id].tsx`

Replaces the `ActionSheetIOS`/`Alert.alert` `openMenu` (lines 55–82) with a `Dropdown` in menu mode anchored to the existing `IconButton`.

- [ ] **Step 1: Update imports**

In `src/app/reports/[id].tsx`, change the line:

```tsx
import { MoreHorizontal, RefreshCw } from 'lucide-react-native';
import { ActionSheetIOS, Alert, Platform, Share, ScrollView } from 'react-native';
```

to:

```tsx
import { MoreHorizontal, RefreshCw, Share2 } from 'lucide-react-native';
import { Share, ScrollView } from 'react-native';
```

Add to the existing `@/components/ui/...` imports:

```tsx
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
```

- [ ] **Step 2: Replace `openMenu` with a menu items builder + handler**

Delete the entire `openMenu` function (the `const openMenu = () => { ... };` block) and replace it with:

```tsx
  type MenuAction = 'share' | 'rerun';

  const canReprocess = !!report && report.processingStatus !== 'PROCESSING' && !reprocess.isPending;

  const menuItems: DropdownOption<MenuAction>[] = [
    { value: 'share', label: 'Share report', icon: Share2 },
    ...(canReprocess
      ? [{ value: 'rerun' as const, label: 'Re-run analysis', icon: RefreshCw }]
      : []),
  ];

  const handleMenuAction = (action: MenuAction) => {
    if (action === 'share') void shareReport();
    else if (action === 'rerun') reprocess.mutate();
  };
```

- [ ] **Step 3: Replace the IconButton with the Dropdown-wrapped trigger**

Replace this block:

```tsx
          <IconButton
            accessibilityLabel="More options"
            icon={<MoreHorizontal size={18} color={palette.brand[700]} strokeWidth={2.2} />}
            onPress={openMenu}
          />
```

with:

```tsx
          <Dropdown
            mode="menu"
            align="end"
            items={menuItems}
            onSelect={handleMenuAction}
            disabled={!report}
            trigger={
              <IconButton
                accessibilityLabel="More options"
                icon={<MoreHorizontal size={18} color={palette.brand[700]} strokeWidth={2.2} />}
              />
            }
          />
```

(The `IconButton` no longer needs `onPress` — the `Dropdown` wraps it in a Pressable.)

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck`
Expected: PASS.
Run: `npx eslint "src/app/reports/[id].tsx"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/reports/[id].tsx"
git commit -m "feat(reports): replace ActionSheet/Alert overflow menu with Dropdown"
```

---

## Task 8: Adopt in reports filter bar (Severity + Status)

**Files:**
- Modify: `src/features/disease-analysis/components/report-filter-bar.tsx`
- Modify: `src/app/(app)/reports.tsx`
- Delete: `src/features/disease-analysis/components/report-filter-sheet.tsx`

Replaces the two `FilterTrigger` pills (which open a bottom sheet) with two pill-variant `Dropdown`s and removes the now-unused sheet + `matchingCount` plumbing.

- [ ] **Step 1: Rewrite `report-filter-bar.tsx`**

Replace the ENTIRE contents of `src/features/disease-analysis/components/report-filter-bar.tsx` with:

```tsx
import { Search, X } from 'lucide-react-native';
import { TextInput } from 'react-native';

import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { PressableScale } from '@/components/ui/pressable-scale';
import type {
  ReportFilter,
  SeverityFilter,
  StatusFilter,
} from '@/features/disease-analysis/utils/filter-reports';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { View } from '@/tw';

interface ReportFilterBarProps {
  value: ReportFilter;
  onChange: (next: ReportFilter) => void;
}

const SEVERITY_OPTIONS: DropdownOption<SeverityFilter>[] = [
  { value: 'all', label: 'All severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

const STATUS_OPTIONS: DropdownOption<StatusFilter>[] = [
  { value: 'all', label: 'Any status' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

// Pill label shows the active selection, or the category name when 'all'.
const SEVERITY_PILL: Record<SeverityFilter, string> = {
  all: 'Severity',
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const STATUS_PILL: Record<StatusFilter, string> = {
  all: 'Status',
  analyzed: 'Analyzed',
  processing: 'Processing',
  failed: 'Failed',
};

/**
 * Search + severity + status filters for the reports history screen. Purely
 * controlled — owns no state. Severity/Status are anchored dropdowns (open on
 * top of all UI); filtering happens client-side in the screen via
 * filterReports().
 */
export function ReportFilterBar({ value, onChange }: ReportFilterBarProps) {
  const theme = useTheme();

  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-2.5">
        <Search size={16} color={palette.brand[400]} strokeWidth={2.2} />
        <TextInput
          value={value.search}
          onChangeText={(search) => onChange({ ...value, search })}
          placeholder="Search crop or disease"
          placeholderTextColor={theme.textFaint}
          style={{ flex: 1, fontSize: 14, color: theme.text, padding: 0 }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.search.length > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onChange({ ...value, search: '' })}
            pressedScale={0.9}
            haptic="selection"
            hitSlop={8}
          >
            <X size={16} color={palette.brand[400]} strokeWidth={2.2} />
          </PressableScale>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        <Dropdown
          triggerVariant="pill"
          align="start"
          value={value.severity === 'all' ? null : value.severity}
          items={SEVERITY_OPTIONS}
          onSelect={(severity) => onChange({ ...value, severity })}
          label={SEVERITY_PILL[value.severity]}
        />
        <Dropdown
          triggerVariant="pill"
          align="end"
          value={value.status === 'all' ? null : value.status}
          items={STATUS_OPTIONS}
          onSelect={(status) => onChange({ ...value, status })}
          label={STATUS_PILL[value.status]}
        />
      </View>
    </View>
  );
}
```

Note on the pill: when `value` is `null` (filter is `'all'`), the pill shows its `label` text ("Severity"/"Status") in the inactive state. When a real value is set, the pill shows that option's label and flips to the active brand style. This relies on the pill empty-state behavior implemented in Task 4 (`hasValue ? displayText : (label ?? displayText)`).

- [ ] **Step 2: Remove `matchingCount` wiring in `reports.tsx`**

In `src/app/(app)/reports.tsx`, replace:

```tsx
          {reports.length > 0 ? (
            <ReportFilterBar
              value={filter}
              onChange={setFilter}
              matchingCount={filtered.length}
            />
          ) : null}
```

with:

```tsx
          {reports.length > 0 ? (
            <ReportFilterBar value={filter} onChange={setFilter} />
          ) : null}
```

- [ ] **Step 3: Delete the now-unused sheet**

Run: `git rm "src/features/disease-analysis/components/report-filter-sheet.tsx"`

- [ ] **Step 4: Verify no dangling references**

Run: `npx eslint src/features/disease-analysis/components/report-filter-bar.tsx "src/app/(app)/reports.tsx"`
Expected: no errors.
Run (sanity — confirm nothing else imports the deleted file): search the repo for `report-filter-sheet`; expect zero matches outside the plan/spec docs.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/features/disease-analysis/components/report-filter-bar.tsx" "src/app/(app)/reports.tsx"
git commit -m "feat(reports): use Dropdown for severity/status filters; remove filter sheet"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm test` (from `apps/mobile`)
Expected: PASS, including the new `anchor-position.test.ts`.

- [ ] **Step 2: Typecheck the whole app**

Run: `npm run typecheck`
Expected: PASS, no errors.

- [ ] **Step 3: Lint the changed/created files**

Run:
```
npx eslint src/components/ui/dropdown "src/app/reports/[id].tsx" "src/app/(app)/reports.tsx" src/features/disease-analysis/components/report-filter-bar.tsx
```
Expected: no errors.

- [ ] **Step 4: Manual device/simulator checks (document results)**

Verify on a running app:
- Reports list → tap Severity pill → dropdown opens anchored below the pill, on top of everything; pick a value → pill turns brand-green with the label; list filters.
- Status pill aligned to its right edge; opens without overflowing the screen edge.
- Report detail → tap the overflow (⋯) → menu opens anchored to the top-right (`align="end"`); "Share report" works; "Re-run analysis" appears only when reprocess is allowed.
- Tap outside the panel → closes. Rotate device while open → panel stays within screen (reopen if needed).
- Android specifically: confirm the panel sits at the correct Y under the trigger (validates `statusBarTranslucent`).

- [ ] **Step 5: Commit any fixes from manual testing**

```bash
git add -A
git commit -m "fix(dropdown): address manual verification findings"
```

(Skip if no fixes were needed.)

---

## Notes for the implementer

- The pure `computeAnchorRect`/`estimateContentHeight` are the only unit-tested pieces; the jest config (`apps/mobile/jest.config.js`) only matches `*.test.ts` in a node env and must not import React Native. Keep `anchor-position.ts` free of RN imports.
- `__DEV__` is a React Native global; it's available at runtime in the app and does not need an import.
- The close animation uses a `setTimeout` to unmount the Modal after the fade — this is intentional and keeps the worklet logic simple. If you prefer, you can drive unmount with `runOnJS` from the `withTiming` completion callback, but the timeout is acceptable and matches the simplicity elsewhere in the repo.
- Do not migrate the profile sheets, notification chips, crop picker, or the map "reports in view" sort toggle — they are intentionally out of scope (see spec).
