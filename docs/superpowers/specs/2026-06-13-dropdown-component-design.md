# Dropdown Component — Design Spec

Date: 2026-06-13
Status: Approved (pending implementation plan)
Area: `apps/mobile`

## Summary

A reusable anchored-popover Dropdown component for the mobile app. It opens a
floating panel positioned at its trigger, rendered above all other UI (including
open bottom sheets, toasts, and banners) by using a transparent React Native
`Modal`. It supports two modes — a single-select value picker and an action
menu — with a rich option list (icons, descriptions, destructive styling,
disabled options, section grouping, internal scrolling). It ships a built-in
trigger (field / pill / icon variants) and also accepts a custom trigger element
so it can anchor to existing UI such as an icon button.

## Goals

- One well-bounded component that covers the app's real single-select and
  action-menu needs without copy-paste.
- Always renders on top in the z-direction, with no z-index coordination.
- Visually and behaviorally consistent with existing UI primitives
  (`Input`, `Button`, `Chip`, `PressableScale`, the `FilterTrigger` pill).
- Adopted thoughtfully at a small number of strong-fit call sites only.

## Non-goals

- No multi-select. The app already uses chip-based bottom sheets for
  multi-select (`map-filter-sheet`, `report-filter-sheet` Severity/Status), which
  works well in that context.
- No inline search/filter. Long, searchable lists (crops) remain bottom-sheet
  pickers.
- No dark mode handling beyond the app's existing light-only theme.
- Not replacing the profile Language/Alert-radius sheets, notification filter
  chips, the crop picker, or the map "reports in view" sort toggle.

## Background / current state

Every "chooser" in the app today is a `@gorhom/bottom-sheet` `BottomSheetModal`
(language, alert radius, crops, map filters, report filters). There is no
anchored-popover/portal host. React Native's `Modal` is not used anywhere yet;
the only OS menu is `ActionSheetIOS` (iOS) / `Alert.alert` (Android) in
`app/reports/[id].tsx`. The most dropdown-like element is the `FilterTrigger`
pill in `features/disease-analysis/components/report-filter-bar.tsx`.

The single portal host is `BottomSheetModalProvider` (mounted in
`app/_layout.tsx`). Absolute-positioned overlays use a zIndex convention
(offline-banner 10000, in-app-banner 9999, toast 9998). A high-zIndex sibling
would NOT render above a `@gorhom/bottom-sheet`, so it is unsuitable for the
"on top of any UI" requirement. A transparent RN `Modal` is an OS-level window
layer and renders above everything, including bottom sheets, with no z-index
bookkeeping.

## Rendering approach (chosen: RN transparent Modal)

The popover renders inside:

```tsx
<Modal transparent statusBarTranslucent animationType="none" visible={open} onRequestClose={close}>
```

- `animationType="none"`: we run our own reanimated scale+fade so the Modal
  window itself does not animate.
- `statusBarTranslucent`: on Android this makes the Modal occupy the full screen
  so `measureInWindow` coordinates align with the Modal origin.
- A full-screen invisible `Pressable` backdrop catches outside taps to close.
  No dark dim — the popover should feel lightweight and anchored, like a native
  menu.
- The Modal stays mounted until the close animation completes, then unmounts.

Rejected alternatives: a root portal host (`FullWindowOverlay` is iOS-only and
unreliable above Modal content; `@gorhom/portal` adds a dependency/provider for
the same result) and a high-zIndex absolute sibling (cannot cover bottom sheets;
fragile zIndex coordination).

## File layout

```
src/components/ui/dropdown/
  dropdown.tsx           # <Dropdown> — public component: trigger + state + Modal popover
  dropdown-trigger.tsx   # built-in trigger variants (field / pill / icon)
  dropdown-option.tsx    # one option row (icon, label, description, check, destructive, disabled)
  use-anchor-position.ts # measures trigger, computes popover rect (flip/clamp); exports pure computeAnchorRect
  types.ts               # DropdownOption, DropdownSection, variant types
  index.ts               # barrel export
```

Conventions to follow exactly: import `View`/`Text` from `@/tw`; compose classes
with `cn`; variant maps as `Record<Variant, string>`; colors from `palette` /
`useTheme()`; all tap surfaces wrap `PressableScale` (`haptic="selection"`,
row `pressedScale={0.98}`); icons from `lucide-react-native`.

## Public API

```ts
import type { LucideIcon } from 'lucide-react-native';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  description?: string;   // secondary line under the label
  icon?: LucideIcon;      // leading icon
  destructive?: boolean;  // red label/icon (action menus)
  disabled?: boolean;     // greyed, non-tappable
}

export interface DropdownSection<T = string> {
  label?: string;         // small uppercase section header
  options: DropdownOption<T>[];
}

export type DropdownItems<T = string> = DropdownOption<T>[] | DropdownSection<T>[];

export type DropdownMode = 'select' | 'menu';
export type DropdownTriggerVariant = 'field' | 'pill' | 'icon';
export type DropdownAlign = 'start' | 'end';
```

`<Dropdown>` props:

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `items` | `DropdownItems<T>` | — | flat list or sectioned list |
| `mode` | `DropdownMode` | `'select'` | `'menu'` = action menu, no persistent selection |
| `value` | `T \| null` | — | select mode only; drives the check + trigger text |
| `onSelect` | `(value: T) => void` | — | fires, then auto-closes |
| `trigger` | `ReactNode` | — | custom trigger; overrides built-in trigger |
| `triggerVariant` | `DropdownTriggerVariant` | `'field'` | built-in trigger style |
| `label` | `string` | — | field label / pill text |
| `placeholder` | `string` | — | shown when `value` is null/unmatched (select mode) |
| `align` | `DropdownAlign` | `'start'` | which trigger edge the panel aligns to |
| `disabled` | `boolean` | `false` | disables the trigger |
| `maxPanelHeight` | `number` | `320` | panel scrolls past this |
| `error` | `string` | — | field variant only: error text + red border |
| `className` | `string` | — | applied to built-in trigger |
| `testID` | `string` | — | |

Behavior notes:
- Select mode: built-in trigger shows the selected option's label (and icon if
  present); a `Check` (brand-600) marks the selected option in the list.
- Menu mode: no check; each option fires `onSelect(value)` and closes.
- `field` trigger mirrors `Input` (uppercase label above, bordered
  `rounded-xl bg-surface` row, `ChevronDown`, error text/red border).
  `pill` mirrors `FilterTrigger` (compact bordered pill; active when a value is
  set → `border-brand-600 bg-brand-600` + white text). `icon` is a tappable
  wrapper around a caller-provided icon.

### Usage examples

Single-select value picker (pill):

```tsx
<Dropdown
  triggerVariant="pill"
  label="Sort"
  value={sort}
  items={[
    { value: 'newest', label: 'Newest first', icon: Clock },
    { value: 'severity', label: 'Highest severity', icon: TriangleAlert },
  ]}
  onSelect={setSort}
/>
```

Action menu anchored to an existing icon button:

```tsx
<Dropdown
  mode="menu"
  align="end"
  trigger={<IconButton icon={MoreHorizontal} accessibilityLabel="More actions" />}
  items={[
    { value: 'share', label: 'Share report', icon: Share2 },
    { value: 'rerun', label: 'Re-run analysis', icon: RefreshCw },
    { value: 'cancel', label: 'Cancel analysis', icon: X, destructive: true },
  ]}
  onSelect={handleAction}
/>
```

## Positioning logic (`use-anchor-position.ts`)

On open, measure the trigger with `measureInWindow` →
`{ x, y, width, height }`. A pure `computeAnchorRect(input)` function computes
the panel rect against window dimensions (`useWindowDimensions`) with an 8px
screen margin:

- Vertical: open below by default (`top = y + height + gap`). If the panel
  height would exceed the space below, flip above (`bottom = y - gap`). If
  neither side fully fits, pin to the larger side; the list scrolls within
  `maxPanelHeight`.
- Horizontal: `align='start'` left-aligns the panel to the trigger's left edge;
  `align='end'` right-aligns to the trigger's right edge. Clamp so the panel
  never crosses the 8px screen margins.
- Width: field/pill triggers → panel matches trigger width (min 180px). Icon
  trigger → intrinsic width (min 200, max 280).
- Recompute on window-dimension changes (rotation) while open.

`gap` ≈ 6px between trigger and panel.

## Animation, haptics, accessibility

- Open: reanimated `opacity` 0→1 and `scale` 0.96→1 over ~140ms, with
  `transformOrigin` toward the trigger edge (top when below, bottom when
  flipped). Close reverses over ~110ms before the Modal unmounts.
- Haptics: `selection` on open and on each pick.
- A11y: trigger `accessibilityRole="button"`, `accessibilityState={{ expanded }}`.
  Options `accessibilityRole={mode === 'menu' ? 'menuitem' : 'button'}` with
  `accessibilityState={{ selected, disabled }}`. Backdrop carries
  `accessibilityViewIsModal` so screen readers stay within the panel.

## Edge cases & error handling

- Empty `items`: render nothing on open + a dev-only warning.
- Disabled option: not tappable, `opacity-50`, no haptic.
- Disabled trigger: does not open.
- `value` with no matching option (select mode): trigger shows `placeholder`.
- Long lists: `ScrollView` within `maxPanelHeight`; section headers scroll with
  content.
- Trigger unmounts while open or `measureInWindow` returns zero size: close and
  do not render a stale-positioned panel.
- Android: `statusBarTranslucent` so measured coordinates match the Modal origin.

## Styling reference (match existing tokens)

- Panel: `bg-surface`, `border border-border`, `rounded-xl`, `shadows.card` (or
  `sheet`), subtle. Internal padding `p-1.5`, options `gap-0.5`.
- Option row: `rounded-lg px-3 py-2.5`, `PressableScale pressedScale={0.98}`.
  Label `text-sm font-bold text-text`; description
  `text-xs text-text-subtle`; leading icon brand-600 (or danger for
  destructive). Selected (select mode): trailing `Check` brand-600 and
  `bg-brand-50`.
- Destructive option: label + icon `text-danger` / `palette.status.danger`.
- Section header: `text-[11px] font-medium uppercase tracking-wider text-text-subtle`,
  with a hairline `border-border` divider between sections.
- Field trigger: mirror `components/ui/input.tsx`. Pill trigger: mirror
  `FilterTrigger` in `report-filter-bar.tsx`.

## Testing

- Unit-test the pure `computeAnchorRect` with fixtures: below-fit, flip-above,
  clamp-left, clamp-right, both-sides-overflow, align start vs end. Fast and
  deterministic.
- The interactive Modal/animation layer is verified manually, consistent with
  the repo (no RN-component render tests exist for sheets).

## Migration (thoughtful adoption)

Replace only these strong-fit call sites:

1. `app/reports/[id].tsx` — replace the `ActionSheetIOS` / `Alert.alert`
   `openMenu` with `<Dropdown mode="menu" align="end" trigger={<existing IconButton>} />`.
   Unifies the iOS/Android split and showcases menu mode. Share / Re-run /
   destructive option(s) preserved.
2. `features/disease-analysis/components/report-filter-bar.tsx` — replace the two
   `FilterTrigger` pills (which open the sheet) with two
   `<Dropdown triggerVariant="pill" />` for Severity and Status. Delete
   `features/disease-analysis/components/report-filter-sheet.tsx` and remove the
   `matchingCount` plumbing in `app/(app)/reports.tsx` that only the sheet used.

Left unchanged: profile Language/Alert-radius sheets (have descriptions, work
well as sheets), notification filter chips (fully visible, no benefit to hiding),
the map "reports in view" sort toggle (lives in a sheet; out of scope), and the
crop picker (searchable long list).

## Risks

- RN `Modal` is new to this codebase; Android full-screen coordinate alignment
  depends on `statusBarTranslucent`. Mitigated by the measure-and-close guard.
- A `Modal` opened from within a `@gorhom/bottom-sheet` (not in the chosen
  migration set) should still render above it; if a future call site needs that,
  verify on device.
