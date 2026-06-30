# Report / Capture Flow Rework — Design

**Date:** 2026-06-12
**Status:** Approved (design phase)
**Area:** `apps/mobile` — report flow / camera capture

## Problem

The first step of the disease report flow (the camera/capture screen) appears
broken: the live camera opens, but the capture (shutter) button and the gallery
picker are not visible, and the flash toggle appears to do nothing. Only the
top-of-screen flash button shows.

### Root cause

The capture step renders inside `(app)/upload.tsx`, which is a **tab screen**.
The app's custom `TabBar` (`apps/mobile/src/components/navigation/tab-bar.tsx`)
is an absolutely-positioned floating glass capsule pinned to the bottom of the
viewport (`position: 'absolute'`, `left/right: 16`, `bottom: ~12-34px`). It is
drawn on top of every tab screen, including the camera.

- The flash button sits at the **top** of the capture screen → visible.
- The shutter and gallery buttons sit at the **bottom** → covered by the
  floating tab bar, so they are rendered but hidden/untappable.

The shutter/gallery controls already exist in `capture-screen.tsx`; they are not
missing, just occluded.

### Secondary issues

- **Flash feels broken.** In `expo-camera` (SDK 56) the `flash` prop only fires
  during the actual photo capture; the live preview never changes, so cycling
  Off → Auto → On gives no visible feedback.
- **Flow is coupled to the tab navigator.** Because the camera lives in a tab,
  the user can swipe/tap away mid-capture and the flow is not truly full-screen.

## Decisions

1. **Move the report flow to a full-screen modal route** outside the tab
   navigator. (Chosen over "lift controls above the bar" and "just add
   padding" — this fixes the root cause permanently.)
2. **Flash → torch toggle.** Simple on/off that drives the live torch (instant
   feedback) and also fires flash at capture time. (Chosen over keeping the
   Off/Auto/On cycle.)
3. **No review/retake step.** Capture continues straight to the analyzing
   screen, exactly as it does today. (Explicitly chosen to keep the flow short.)

## Design

### 1. Routing — move the flow out of the tabs

- Create a new root-stack route `apps/mobile/src/app/report.tsx` containing what
  is currently in `(app)/upload.tsx` (the four-step state machine driver).
- Register it in the root `Stack` in `apps/mobile/src/app/_layout.tsx` with
  `animation: 'slide_from_bottom'`, matching the existing `reports/[id]`
  pattern. The root stack already hosts non-tab routes, so this is a natural
  fit. No tab bar renders over it; the camera is genuinely full-screen and the
  user cannot switch tabs mid-capture.
- Remove the `upload` `Tabs.Screen` entry from `(app)/_layout.tsx` and delete
  `(app)/upload.tsx`.
- Update internal references from `/upload` to `/report`. Known reference:
  `SubmittedScreen`'s "Report another" action calls `router.replace('/upload')`.
  Grep for any other `/upload` usages and update them.

### 2. TabBar — FAB becomes an action, not a tab

- The center `+` FAB is currently derived from the `upload` route in the tab
  list. After removing `upload`, restructure `TabBar` to render the four real
  tabs (Home, Map, Alerts, Profile) and inject a standalone center FAB.
- The FAB's `onPress` calls `router.push('/report')`. Visual appearance and
  position are unchanged: `index, map, [FAB], alerts, profile`.

### 3. Camera controls

- Full-screen rendering means the existing shutter + gallery buttons are no
  longer occluded.
- Replace the 3-way Off/Auto/On flash cycle in `capture-screen.tsx` with a
  simple on/off torch toggle:
  - Drives `CameraView`'s live torch so the light turns on immediately
    (real feedback).
  - The capture call also fires with flash on when the toggle is on.
  - **Verify the exact SDK 56 prop name** (`enableTorch` vs `flash`) against the
    versioned Expo docs (`https://docs.expo.dev/versions/v56.0.0/`) per
    `apps/mobile/AGENTS.md` before implementing.
- Keep the safe-area-aware bottom control row so controls clear the home
  indicator.
- Keep the lazy/fallback split (`capture-lazy.tsx` → `capture-fallback.tsx`).
  It remains the correct escape hatch for dev clients built without
  `expo-camera`.

### Unchanged

- The flow state machine in `use-report-flow.ts` (capture → analyzing → result
  → submitted) is untouched.
- `analyzing-screen`, `result-screen`, `submitted-screen`, and the edit sheet
  keep their current behavior.

## Verification

- `pnpm typecheck` and lint in `apps/mobile`.
- Existing report-flow unit tests pass (state machine untouched).
- Manual checks:
  - FAB opens the full-screen flow with a slide-from-bottom animation.
  - All four controls are visible and tappable: close, flash, shutter, gallery.
  - Toggling flash turns the torch on/off live.
  - Capturing (or picking from gallery) advances to the analyzing screen.
  - No tab bar is visible over the camera; cannot switch tabs mid-flow.

## Out of scope

- Review/retake step (explicitly declined).
- Changes to analysis engines, result UI, or submission logic.
- Unrelated tab bar restyling.
