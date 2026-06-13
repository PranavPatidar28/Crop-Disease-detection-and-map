# Farmer Feedback on Advisory — Design

Date: 2026-06-13
Branch: `feat/farmer-feedback`
Scope: **Demo UI only.** No backend, no API, no persistence.

## Problem

After a farmer reads a report's advisory/recommendations, we have no way to know
whether that guidance actually helped them. We want a low-friction way for the
farmer to signal "did this advice help?" and optionally leave a comment, directly
on the report they're reading.

## Scope

This iteration implements **demo UI only**:

- Local component state only. No API call, no store, no AsyncStorage.
- Feedback state resets when the report detail screen unmounts.
- A real backend (mutation + persistence + aggregation) is explicitly out of scope
  and left for a future iteration.

## Placement

A "Was this helpful?" card rendered inline on the report detail screen
(`apps/mobile/src/app/reports/[id].tsx`), inserted **after `ResultActions`** and
**before the AI-disclaimer footer** (around line 188).

It renders only in the finished-result branch — the same branch that already shows
the advisory/recommendations. We do not ask for feedback while the report is
`PENDING`/`PROCESSING` or in the error state, because there is no guidance to
evaluate yet.

The card is wrapped in the same `AnimatedView` entering-animation pattern used by
its sibling sections (e.g. `FadeInDown.delay(...).duration(400)`). It sits between
`ResultActions` (currently `delay(260)`) and the AI-disclaimer footer (currently
`delay(320)`), so it uses an entering delay in that range (e.g. `delay(290)`) and
the disclaimer is bumped to a slightly later delay to remain the last item.

## Component

New feature component:

- `apps/mobile/src/features/disease-analysis/components/report-feedback.tsx`
- Exported via the existing `components/index.ts` barrel.

```tsx
<ReportFeedback />   // self-contained, owns its own local state
```

The component takes **no required report-specific props** for the demo, keeping it
a clean, reusable unit. The parent (`[id].tsx`) just drops `<ReportFeedback />` into
the screen.

### Internal state

- `vote: 'up' | 'down' | null` — which thumb is selected
- `comment: string` — the optional comment text
- `submitted: boolean` — whether feedback has been sent (drives the thank-you state)

### Reused primitives

- `Card` (`padding="md"`) — container, matching sibling sections.
- `SectionLabel` — section heading style.
- `PressableScale` — the thumb buttons (scale-on-press, like `ResultActions`).
- `Button` (primary) — "Submit"; `TextButton` — "Edit".
- React Native `TextInput` — the optional comment field.
- Icons: `ThumbsUp` / `ThumbsDown` from `lucide-react-native`, plus a check glyph
  for the thank-you state. Colors from `palette.brand.*`, matching the screen.
- Haptics: `expo-haptics` `Haptics.selectionAsync()` on thumb tap, matching the
  existing screen convention.

### Conventions

The report detail screen uses plain English strings ("Report", "Advisory",
"Detected"), **not** the `t()` i18n keys used on other screens. To stay consistent
with the screen it lives on, the feedback card uses plain English strings too.
(i18n can be retrofitted alongside the rest of `[id].tsx` later.)

## Interaction flow & states

The card has three visual states:

### State A — Prompt (initial)

- Header: "Was this helpful?"
- Two thumb buttons side by side: thumbs-up ("Yes") and thumbs-down ("No").
- No comment box yet — keeps the initial state clean.

### State B — Vote selected (not yet submitted)

- Tapped thumb shows selected (brand-tinted fill); the other stays neutral.
- A comment `TextInput` appears below (placeholder: "Add a comment (optional)").
- A primary "Submit" button appears.
- Tapping the other thumb switches the selection (does not submit).
- Light haptic (`selectionAsync`) on each thumb tap.

### State C — Thank-you (submitted)

- Card collapses to a compact confirmation: a check/thumb glyph + "Thanks for your
  feedback".
- One-line echo of the choice: "You found this helpful" / "You said this didn't
  help".
- The comment, if any, is shown beneath.
- An "Edit" `TextButton` returns to State B with the prior `vote` and `comment`
  preserved.

Transitions use the same reanimated fade/layout feel as the rest of the screen so
they don't jar.

## Out of scope (future iterations)

- Backend mutation + persistence of feedback.
- Aggregating feedback for analytics / model improvement.
- i18n strings for the feedback card (deferred with the rest of `[id].tsx`).
- Surfacing feedback anywhere outside the report detail screen.
