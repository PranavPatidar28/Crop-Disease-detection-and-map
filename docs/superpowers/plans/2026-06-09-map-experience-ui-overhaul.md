# Map Experience UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix crop-icon clipping and elevate the whole map experience (markers, outbreak zones, floating controls, detail sheets) to the approved premium language.

**Architecture:** Add the subset of premium theme tokens the map needs (forest colors, warm shadows, a shared map-severity-fill helper), then restyle each map component to consume them. Markers become self-contained teardrops whose static first frame is the complete look (no animation-dependent rendering, the root cause of clipping). Outbreak zones become a stacked-circle radial gradient. Controls fuse into a glass capsule. Both detail sheets gain a forest-gradient hero + tonal stat cards.

**Tech Stack:** Expo SDK 56 / RN 0.85, NativeWind v5 + Tailwind v4 (`@/tw`), `react-native-maps`, `expo-glass-effect`, `expo-linear-gradient`, `react-native-reanimated`, zustand.

**Verification note:** This project has **no test framework** (no `test` script, no jest/vitest config, no test files in `apps/mobile/src`). Setting one up for largely-visual native-map components is out of scope and low-value. Instead: (a) pure logic is extracted into small helpers and sanity-checked with a temporary node script that is deleted after, (b) every task is verified with `pnpm typecheck` and `npx eslint <file>` from `apps/mobile`, and (c) a visual checklist in the final task. If the maintainer later adds a test runner, the extracted helpers in Tasks 1 are ready to unit-test.

**Working directory for all commands:** `apps/mobile` (the mobile workspace). Paths below are relative to repo root.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `apps/mobile/src/theme/colors.ts` | Add forest / forest-end / forest-accent tokens | Modify |
| `apps/mobile/src/theme/shadows.ts` | Add warm-tinted `cardWarm`, `hero`, `capsule` shadow presets | Modify |
| `apps/mobile/src/features/map-system/utils/marker-colors.ts` | Single source for map severity fill + opacity ramp | Create |
| `apps/mobile/src/features/map-system/components/map-marker.tsx` | Teardrop marker (no pulse) + retuned cluster | Modify |
| `apps/mobile/src/features/outbreak-system/components/outbreak-zone-layer.tsx` | Stacked-circle gradient glow + boundary ring + teardrop hub w/ badge | Modify |
| `apps/mobile/src/app/(app)/map.tsx` | Marker `anchor` for teardrop tail | Modify |
| `apps/mobile/src/features/map-system/components/map-search-bar.tsx` | Glass search bar, softer radius, warm shadow | Modify |
| `apps/mobile/src/features/map-system/components/map-controls.tsx` | Fuse FABs into one glass capsule w/ dividers | Modify |
| `apps/mobile/src/components/ui/sheet-hero.tsx` | Reusable forest-gradient hero card for sheets | Create |
| `apps/mobile/src/components/ui/stat-card.tsx` (map variant) | Reusable tonal stat card | Create (new, map-local) |
| `apps/mobile/src/features/outbreak-system/components/outbreak-detail-sheet.tsx` | Forest hero + tonal stats + aligned container | Modify |
| `apps/mobile/src/features/map-system/components/report-detail-sheet.tsx` | Forest hero + tonal stats (shared language) | Modify |

---

## Task 1: Theme tokens — forest colors + warm shadows

**Files:**
- Modify: `apps/mobile/src/theme/colors.ts`
- Modify: `apps/mobile/src/theme/shadows.ts`

- [ ] **Step 1: Add forest tokens to `lightColors`**

In `apps/mobile/src/theme/colors.ts`, add these three lines inside the `lightColors` object, right after the `primaryTint` line (line 46):

```ts
  forest: '#0f3d2e',
  forestEnd: '#13503a',
  forestAccent: '#7fe6bf',
```

- [ ] **Step 2: Add warm shadow presets**

In `apps/mobile/src/theme/shadows.ts`, add three entries to the `shadows` object (after `ctaSoft`, line 32). Keep existing entries untouched:

```ts
  cardWarm: make('#282e26', 0.12, 18, 6, 5),
  hero: make('#0f3d2e', 0.34, 20, 8, 8),
  capsule: make('#282e26', 0.14, 16, 4, 6),
```

- [ ] **Step 3: Verify typecheck passes**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: no errors (exit 0, no output).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/theme/colors.ts apps/mobile/src/theme/shadows.ts
git commit -m "feat(map): add forest tokens and warm shadow presets"
```

---

## Task 2: Shared map severity-fill + opacity ramp helper

Extracts the marker fill colors (currently private in `map-marker.tsx`) and the zone gradient opacity ramp into one pure, importable module so markers, zone hubs, and badges stay in sync.

**Files:**
- Create: `apps/mobile/src/features/map-system/utils/marker-colors.ts`

- [ ] **Step 1: Create the helper module**

Create `apps/mobile/src/features/map-system/utils/marker-colors.ts`:

```ts
import type { Severity } from '@/features/upload-report/types';

/**
 * Map-tuned severity fills. Slightly more saturated than the global status
 * tokens so markers stay legible on the light map background. Single source for
 * report markers, outbreak hub markers, and badges.
 */
const SEVERITY_FILL: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#047857',
  MEDIUM: '#d97706',
  HIGH: '#dc2626',
};

export function mapSeverityFill(severity: Severity | null | undefined): string {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  if (norm === 'HIGH') return SEVERITY_FILL.HIGH;
  if (norm === 'MEDIUM') return SEVERITY_FILL.MEDIUM;
  return SEVERITY_FILL.LOW;
}

/** A single concentric ring in the zone glow. */
export interface ZoneGlowStep {
  /** Radius as a fraction (0-1) of the zone's outer radius. */
  radiusFactor: number;
  /** Fill opacity 0-1. */
  opacity: number;
}

/**
 * Builds the stacked-circle radial-gradient approximation for an outbreak zone.
 * Densest/smallest at the core, faint/largest at the boundary. HIGH severity
 * gets a denser core than MEDIUM/LOW. Enough steps that banding is invisible.
 */
export function zoneGlowSteps(severity: Severity | null | undefined): ZoneGlowStep[] {
  const norm = (severity ?? 'LOW').toString().toUpperCase();
  const peak = norm === 'HIGH' ? 0.26 : norm === 'MEDIUM' ? 0.2 : 0.16;
  // 6 steps from outer (factor 1.0) to core (factor ~0.18).
  const factors = [1.0, 0.84, 0.66, 0.5, 0.34, 0.18];
  const maxIdx = factors.length - 1;
  return factors.map((radiusFactor, i) => ({
    radiusFactor,
    // opacity rises from a faint floor at the edge to `peak` at the core
    opacity: Number((0.05 + (peak - 0.05) * (i / maxIdx)).toFixed(3)),
  }));
}
```

- [ ] **Step 2: Sanity-check the ramp with a temporary script**

Create a throwaway file `apps/mobile/_tmp-check.mjs`:

```js
// Mirror of zoneGlowSteps for a quick numeric sanity check (no TS runtime needed).
const factors = [1.0, 0.84, 0.66, 0.5, 0.34, 0.18];
const peak = 0.26;
const maxIdx = factors.length - 1;
const steps = factors.map((radiusFactor, i) => ({
  radiusFactor,
  opacity: Number((0.05 + (peak - 0.05) * (i / maxIdx)).toFixed(3)),
}));
console.log(steps);
// Expect: opacity ascends 0.05 -> 0.26 as radiusFactor shrinks 1.0 -> 0.18
```

Run (from `apps/mobile`): `node _tmp-check.mjs`
Expected output: 6 objects; first `{radiusFactor:1, opacity:0.05}`, last `{radiusFactor:0.18, opacity:0.26}`, monotonically increasing opacity.

- [ ] **Step 3: Delete the temporary script**

```bash
rm apps/mobile/_tmp-check.mjs
```

- [ ] **Step 4: Verify typecheck passes**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/map-system/utils/marker-colors.ts
git commit -m "feat(map): shared severity-fill and zone glow ramp helper"
```

---

## Task 3: Teardrop report marker (fixes clipping)

Replaces the circular marker + scaling pulse with a self-contained teardrop whose static frame is complete. Removes the animation that caused clipping.

**Files:**
- Modify: `apps/mobile/src/features/map-system/components/map-marker.tsx`

- [ ] **Step 1: Replace the `MapMarker` component**

In `apps/mobile/src/features/map-system/components/map-marker.tsx`, replace the entire file contents from the top through the end of the `MapMarker` function (lines 1–104) with the following. Keep the `MapCluster` component below it for now (Step 2 retunes it):

```tsx
import { LinearGradient } from 'expo-linear-gradient';

import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import type { Severity } from '@/features/upload-report/types';
import { mapSeverityFill } from '@/features/map-system/utils/marker-colors';

interface MapMarkerProps {
  severity: Severity | null;
  cropEmoji?: string;
  /** Kept for API compatibility; no longer drives animation. */
  enablePulse?: boolean;
}

/**
 * Refined teardrop marker. Solid severity-colored body with a white crop emoji
 * and a tail that points to the exact coordinate (pair with the Marker's
 * `anchor={{ x: 0.5, y: 1 }}` so the tail tip marks the spot).
 *
 * No animation: react-native-maps rasterizes marker children into a one-time
 * bitmap clipped to the view bounds. The previous scaling pulse exceeded those
 * bounds and was clipped on zoom. Everything here sits inside a padded box, so
 * the static first frame is the complete, correct look.
 */
export function MapMarker({ severity, cropEmoji }: MapMarkerProps) {
  const fill = mapSeverityFill(severity);
  const size = 40;

  return (
    // Padding wrapper keeps body border + tail + shadow inside the bitmap bounds.
    <View style={{ paddingTop: 6, paddingHorizontal: 6, paddingBottom: 12, alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        {/* tail: rotated square peeking below the body */}
        <View
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -5,
            width: 14,
            height: 14,
            marginLeft: -7,
            borderRadius: 3,
            backgroundColor: fill,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: '#ffffff',
            shadowColor: '#282e26',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.32,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 18 }}>{cropEmoji ?? '🌿'}</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Retune the cluster border/shadow to match**

In the same file, in `MapCluster`, change the bubble's `shadowColor` line from `shadowColor: shadowTint,` so the offset/opacity match the warm language. Replace the shadow block in the cluster's root `View` style (currently lines ~138-142) with:

```tsx
        shadowColor: shadowTint,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
        elevation: 6,
```

(Only the `shadowOpacity` value changes from `0.4` to `0.45`; if it already reads `0.45` leave it. The cluster otherwise stays — it already reads as the same family.)

- [ ] **Step 3: Verify the unused reanimated imports are gone**

Confirm the new file no longer imports `react-native-reanimated`, `useEffect`, `useSharedValue`, etc. (Step 1's replacement already drops them.) `palette` is still used by `MapCluster`.

Run (from `apps/mobile`): `npx eslint src/features/map-system/components/map-marker.tsx`
Expected: no errors (no unused-import warnings).

- [ ] **Step 4: Verify typecheck passes**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: no errors. (`enablePulse` prop still accepted, so `map.tsx`'s `enablePulse={...}` call site still typechecks.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/map-system/components/map-marker.tsx
git commit -m "feat(map): teardrop report marker, remove clipping pulse"
```

---

## Task 4: Point the marker anchor at the teardrop tail

The teardrop's tip is at the bottom-center, so the marker must anchor there.

**Files:**
- Modify: `apps/mobile/src/app/(app)/map.tsx:304`

- [ ] **Step 1: Update the report Marker anchor**

In `apps/mobile/src/app/(app)/map.tsx`, find the report `<Marker>` (around line 299-304) and change its anchor from `anchor={{ x: 0.5, y: 0.5 }}` to:

```tsx
                  anchor={{ x: 0.5, y: 1 }}
```

Leave the cluster and plot markers' anchors as-is (those are still centered shapes).

- [ ] **Step 2: Verify typecheck passes**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/src/app/(app)/map.tsx"
git commit -m "fix(map): anchor teardrop report marker at its tail tip"
```

---

## Task 5: Outbreak zone — stacked-circle gradient glow

Replaces the single translucent circle + animated hub with a 6-circle radial glow, a boundary ring, and a teardrop hub carrying a count badge.

**Files:**
- Modify: `apps/mobile/src/features/outbreak-system/components/outbreak-zone-layer.tsx`

- [ ] **Step 1: Replace the entire file**

Replace all of `apps/mobile/src/features/outbreak-system/components/outbreak-zone-layer.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Circle, Marker } from 'react-native-maps';

import type { OutbreakZone } from '@/features/map-system/types';
import { mapSeverityFill, zoneGlowSteps } from '@/features/map-system/utils/marker-colors';
import { Text, View } from '@/tw';

interface OutbreakZoneLayerProps {
  zone: OutbreakZone;
  onPress?: (zone: OutbreakZone) => void;
}

/** Two-hex-digit alpha suffix (00-ff) for an 0-1 opacity. */
function alphaHex(opacity: number): string {
  const clamped = Math.max(0, Math.min(1, opacity));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Outbreak zone: a radial-gradient glow (approximated by stacked stepped-opacity
 * Circles, since react-native-maps Circle has no gradient fill), a faint solid
 * boundary ring at the true radius, and a center teardrop hub with a report
 * count badge. Tapping the hub opens the detail sheet.
 *
 * The hub is a static bitmap (no animation): everything sits inside a padded
 * box so nothing is clipped on the Android marker raster. `tracksViewChanges`
 * is held true briefly to capture layout, then disabled for performance.
 */
export function OutbreakZoneLayer({ zone, onPress }: OutbreakZoneLayerProps) {
  const fill = mapSeverityFill(zone.severity);
  const dimmed = !zone.active;
  const steps = zoneGlowSteps(zone.severity);
  const dimFactor = dimmed ? 0.45 : 1;

  const [tracksChanges, setTracksChanges] = useState(true);
  const contentKey = `${zone.disease}|${zone.reportCount}|${zone.severity}|${zone.active}`;
  const [prevKey, setPrevKey] = useState(contentKey);
  if (prevKey !== contentKey) {
    setPrevKey(contentKey);
    setTracksChanges(true);
  }
  useEffect(() => {
    const t = setTimeout(() => setTracksChanges(false), 600);
    return () => clearTimeout(t);
  }, [contentKey]);

  return (
    <>
      {/* Radial glow: outer (faint, large) first so inner (dense, small) layers on top */}
      {steps.map((step, i) => (
        <Circle
          key={`glow-${i}`}
          center={{ latitude: zone.latitude, longitude: zone.longitude }}
          radius={zone.radius * step.radiusFactor}
          fillColor={`${fill}${alphaHex(step.opacity * dimFactor)}`}
          strokeColor="transparent"
          strokeWidth={0}
          zIndex={i}
        />
      ))}

      {/* Boundary ring at the true outer radius */}
      <Circle
        center={{ latitude: zone.latitude, longitude: zone.longitude }}
        radius={zone.radius}
        fillColor="transparent"
        strokeColor={`${fill}${dimmed ? '55' : '99'}`}
        strokeWidth={1.5}
        zIndex={steps.length}
      />

      {/* Center hub teardrop with count badge */}
      <Marker
        coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
        anchor={{ x: 0.5, y: 1 }}
        tracksViewChanges={tracksChanges}
        onPress={() => onPress?.(zone)}
      >
        <View style={{ paddingTop: 8, paddingHorizontal: 10, paddingBottom: 12, alignItems: 'center' }}>
          <View style={{ width: 42, height: 42, opacity: dimmed ? 0.6 : 1 }}>
            {/* tail */}
            <View
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -5,
                width: 15,
                height: 15,
                marginLeft: -7.5,
                borderRadius: 3,
                backgroundColor: fill,
                transform: [{ rotate: '45deg' }],
              }}
            />
            {/* body */}
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: fill,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2.5,
                borderColor: '#ffffff',
                shadowColor: '#282e26',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.32,
                shadowRadius: 6,
                elevation: 6,
              }}
            >
              <Text style={{ fontSize: 18 }}>🦠</Text>
            </View>
            {/* count badge */}
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 5,
                borderRadius: 10,
                backgroundColor: '#ffffff',
                borderWidth: 2,
                borderColor: fill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '800', color: fill }}>
                {zone.reportCount}
              </Text>
            </View>
          </View>
        </View>
      </Marker>
    </>
  );
}
```

- [ ] **Step 2: Verify lint passes**

Run (from `apps/mobile`): `npx eslint src/features/outbreak-system/components/outbreak-zone-layer.tsx`
Expected: no errors (the adjust-state-on-prop-change pattern avoids the `set-state-in-effect` rule; no unused imports — `severityVisuals`/`useTheme` are gone).

- [ ] **Step 3: Verify typecheck passes**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/outbreak-system/components/outbreak-zone-layer.tsx
git commit -m "feat(map): outbreak zone radial gradient glow + count-badge hub"
```

---

## Task 6: Glass capsule controls

Fuses the three FABs into one frosted glass capsule with hairline dividers.

**Files:**
- Modify: `apps/mobile/src/features/map-system/components/map-controls.tsx`

- [ ] **Step 1: Replace the file**

Replace all of `apps/mobile/src/features/map-system/components/map-controls.tsx` with:

```tsx
import { GlassView } from 'expo-glass-effect';
import { Layers, Locate, SlidersHorizontal } from 'lucide-react-native';
import { Platform } from 'react-native';

import { PressableScale } from '@/components/ui/pressable-scale';
import { View } from '@/tw';
import { palette } from '@/theme/colors';

interface MapControlsProps {
  layerMode: 'markers' | 'heatmap' | 'both';
  filtersActive: boolean;
  onLocate: () => void;
  onLayerToggle: () => void;
  onFilter: () => void;
}

const CapsuleBtn = ({
  active,
  onPress,
  accessibilityLabel,
  children,
}: {
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
}) => (
  <PressableScale
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    pressedScale={0.9}
    haptic="selection"
    className="h-11 w-11 items-center justify-center rounded-2xl"
  >
    {children}
    {active ? (
      <View
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.brand[600],
        }}
      />
    ) : null}
  </PressableScale>
);

const Divider = () => (
  <View style={{ height: 1, marginHorizontal: 8, backgroundColor: 'rgba(40,46,38,0.10)' }} />
);

/**
 * Single floating glass capsule: locate, layer-toggle, filter. The filter
 * affordance lives here only (the search bar no longer duplicates it).
 */
export function MapControls({
  layerMode,
  filtersActive,
  onLocate,
  onLayerToggle,
  onFilter,
}: MapControlsProps) {
  const layerActive = layerMode !== 'markers';
  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        padding: 4,
        shadowColor: '#282e26',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 6,
      }}
    >
      <CapsuleBtn onPress={onLocate} accessibilityLabel="Center on me">
        <Locate size={18} color={palette.brand[700]} strokeWidth={2.2} />
      </CapsuleBtn>
      <Divider />
      <CapsuleBtn active={layerActive} onPress={onLayerToggle} accessibilityLabel="Toggle map layers">
        <Layers
          size={18}
          color={layerActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </CapsuleBtn>
      <Divider />
      <CapsuleBtn active={filtersActive} onPress={onFilter} accessibilityLabel="Open filters">
        <SlidersHorizontal
          size={18}
          color={filtersActive ? palette.brand[600] : palette.brand[700]}
          strokeWidth={2.2}
        />
      </CapsuleBtn>
    </GlassView>
  );
}
```

- [ ] **Step 2: Verify lint + typecheck**

Run (from `apps/mobile`): `npx eslint src/features/map-system/components/map-controls.tsx`
Then: `pnpm typecheck`
Expected: both clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/map-system/components/map-controls.tsx
git commit -m "feat(map): fuse map controls into a glass capsule"
```

---

## Task 7: Glass search bar (and drop the duplicate filter button)

**Files:**
- Modify: `apps/mobile/src/features/map-system/components/map-search-bar.tsx`
- Modify: `apps/mobile/src/app/(app)/map.tsx` (props)

- [ ] **Step 1: Replace the search bar file**

Replace all of `apps/mobile/src/features/map-system/components/map-search-bar.tsx` with:

```tsx
import { GlassView } from 'expo-glass-effect';
import { Search } from 'lucide-react-native';
import { Platform, Pressable } from 'react-native';

import { ConnectionPill } from '@/features/map-system/components/connection-pill';
import { Text, View } from '@/tw';
import { palette } from '@/theme/colors';

interface MapSearchBarProps {
  isConnected: boolean;
  reportCount: number;
  onPressSearch: () => void;
}

/**
 * The Map screen's top search bar — frosted glass. Tapping opens the filter
 * sheet (faux search field for now). The connection/count pill sits on the
 * right. The dedicated filter button has moved to the controls capsule, so it
 * is no longer duplicated here.
 */
export function MapSearchBar({ isConnected, reportCount, onPressSearch }: MapSearchBarProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Search area or crop"
      onPress={onPressSearch}
    >
      <GlassView
        glassEffectStyle="regular"
        tintColor={Platform.OS === 'ios' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 18,
          overflow: 'hidden',
          paddingHorizontal: 14,
          paddingVertical: 11,
          shadowColor: '#282e26',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 5,
        }}
      >
        <Search size={16} color={palette.brand[700]} strokeWidth={2.2} />
        <Text className="flex-1 text-sm font-medium text-text-faint" numberOfLines={1}>
          Search area or crop…
        </Text>
        <ConnectionPill isConnected={isConnected} reportCount={reportCount} />
      </GlassView>
    </Pressable>
  );
}
```

- [ ] **Step 2: Update the call site in `map.tsx`**

In `apps/mobile/src/app/(app)/map.tsx`, find the `<MapSearchBar ... />` (around line 325-330). Remove the `onPressFilter` prop (the component no longer accepts it). It should read:

```tsx
            <MapSearchBar
              isConnected={isConnected}
              reportCount={filteredReports.length}
              onPressSearch={() => filterSheetRef.current?.present()}
            />
```

- [ ] **Step 3: Verify lint + typecheck**

Run (from `apps/mobile`): `npx eslint src/features/map-system/components/map-search-bar.tsx "src/app/(app)/map.tsx"`
Then: `pnpm typecheck`
Expected: both clean (removing `onPressFilter` resolves any unused-prop concerns; `SlidersHorizontal` import is gone from the search bar).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/map-system/components/map-search-bar.tsx "apps/mobile/src/app/(app)/map.tsx"
git commit -m "feat(map): glass search bar, remove duplicate filter button"
```

---

## Task 8: Reusable sheet hero + tonal stat card

Two small primitives both detail sheets will share.

**Files:**
- Create: `apps/mobile/src/features/map-system/components/sheet-hero.tsx`
- Create: `apps/mobile/src/features/map-system/components/sheet-stat-card.tsx`

- [ ] **Step 1: Create the forest hero**

Create `apps/mobile/src/features/map-system/components/sheet-hero.tsx`:

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';

import { lightColors } from '@/theme/colors';
import { Text, View } from '@/tw';

interface SheetHeroProps {
  /** Small uppercase eyebrow label, e.g. "Active outbreak". */
  eyebrow: string;
  /** Main title, e.g. the disease name. */
  title: string;
  /** Big headline number, e.g. report count or confidence. */
  metric: string;
  /** Caption to the right of the metric, e.g. "reports in this zone". */
  metricCaption: string;
  /** Trailing element on the eyebrow row, e.g. a severity badge. */
  badge?: ReactNode;
}

/**
 * Deep-forest gradient hero card. The signature premium surface: leads with a
 * big bold number, with an eyebrow + title above it. Used at the top of the
 * map detail sheets.
 */
export function SheetHero({ eyebrow, title, metric, metricCaption, badge }: SheetHeroProps) {
  return (
    <View
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: lightColors.forest,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.34,
        shadowRadius: 20,
        elevation: 8,
      }}
    >
      <LinearGradient
        colors={[lightColors.forest, lightColors.forestEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 18 }}
      >
        <View className="flex-row items-start justify-between">
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: lightColors.forestAccent,
            }}
          >
            {eyebrow}
          </Text>
          {badge}
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff', marginTop: 4 }} numberOfLines={2}>
          {title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
          <Text style={{ fontSize: 40, fontWeight: '800', color: '#ffffff', lineHeight: 42 }}>
            {metric}
          </Text>
          <Text style={{ fontSize: 12, color: lightColors.forestAccent }}>{metricCaption}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
```

- [ ] **Step 2: Create the tonal stat card**

Create `apps/mobile/src/features/map-system/components/sheet-stat-card.tsx`:

```tsx
import { Text, View } from '@/tw';

type Tone = 'neutral' | 'danger';

interface SheetStatCardProps {
  value: string;
  label: string;
  tone?: Tone;
}

const TONES: Record<Tone, { bg: string; border: string; value: string; label: string }> = {
  neutral: { bg: '#f6f4ee', border: '#ece6d9', value: '#23291f', label: '#8a8472' },
  danger: { bg: '#fee2e2', border: '#fee2e2', value: '#b91c1c', label: '#b91c1c' },
};

/** Rounded tonal stat card: big number + uppercase caption. Tint conveys status. */
export function SheetStatCard({ value, label, tone = 'neutral' }: SheetStatCardProps) {
  const t = TONES[tone];
  return (
    <View
      style={{
        flex: 1,
        minWidth: 90,
        borderRadius: 16,
        padding: 12,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '800', lineHeight: 26, color: t.value }}>{value}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: t.label,
          marginTop: 5,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Verify lint + typecheck**

Run (from `apps/mobile`): `npx eslint src/features/map-system/components/sheet-hero.tsx src/features/map-system/components/sheet-stat-card.tsx`
Then: `pnpm typecheck`
Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/map-system/components/sheet-hero.tsx apps/mobile/src/features/map-system/components/sheet-stat-card.tsx
git commit -m "feat(map): reusable forest hero and tonal stat card for sheets"
```

---

## Task 9: Outbreak detail sheet — forest hero + tonal stats

**Files:**
- Modify: `apps/mobile/src/features/outbreak-system/components/outbreak-detail-sheet.tsx`

- [ ] **Step 1: Swap the header + stats block**

In `apps/mobile/src/features/outbreak-system/components/outbreak-detail-sheet.tsx`:

1. Add imports near the existing ones (after line 31's `SeverityIndicator` import):

```tsx
import { SheetHero } from '@/features/map-system/components/sheet-hero';
import { SheetStatCard } from '@/features/map-system/components/sheet-stat-card';
```

2. Replace the header `View` block (lines 68–96, the `<View className="flex-row items-start justify-between">...</View>` containing the eyebrow, title, severity, and close button) AND the GlassView stats block (lines 98–128) with this single block:

```tsx
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <SheetHero
                  eyebrow={outbreak.active ? 'Active outbreak' : 'Resolved outbreak'}
                  title={outbreak.disease}
                  metric={`${outbreak.reportCount}`}
                  metricCaption="reports in this zone"
                  badge={<SeverityIndicator severity={outbreak.severity} variant="expanded" />}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface"
              >
                <X size={18} color={theme.text} strokeWidth={2} />
              </Pressable>
            </View>

            <View className="flex-row gap-2">
              <SheetStatCard value={`${outbreak.highCount}`} label="High severity" tone="danger" />
              <SheetStatCard value={`${(outbreak.radius / 1000).toFixed(1)} km`} label="Radius" />
              <SheetStatCard value={timeAgo(outbreak.lastSeenAt)} label="Last report" />
            </View>
```

3. Remove the now-unused imports: `GlassView` (line 6), and the `Activity`, `TrendingUp`, `Clock` icon imports if no longer referenced. Check usage — `Clock`/`Activity`/`TrendingUp` were only used in the old `Stat` rows. Also delete the old `Stat` helper function (lines 267–292) since it's replaced by `SheetStatCard`. Keep `MapPin`, `Sparkles`, `ChevronRight`, `X` (still used below).

- [ ] **Step 2: Align the sheet container styling with the report sheet**

Replace the `backgroundStyle` and `handleIndicatorStyle` on the `BottomSheetModal` (lines 53–54) with:

```tsx
        backgroundStyle={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderWidth: 1,
          borderColor: '#efeae0',
          borderBottomWidth: 0,
        }}
        handleIndicatorStyle={{ backgroundColor: '#e8e4dc', width: 36 }}
```

- [ ] **Step 3: Verify lint + typecheck**

Run (from `apps/mobile`): `npx eslint src/features/outbreak-system/components/outbreak-detail-sheet.tsx`
Then: `pnpm typecheck`
Expected: both clean. If eslint reports an unused import (`GlassView`, `Activity`, `TrendingUp`, `Clock`, or the old `Stat`), remove it and re-run.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/features/outbreak-system/components/outbreak-detail-sheet.tsx
git commit -m "feat(map): forest hero + tonal stats in outbreak detail sheet"
```

---

## Task 10: Report detail sheet — forest hero + tonal stats

**Files:**
- Modify: `apps/mobile/src/features/map-system/components/report-detail-sheet.tsx`

- [ ] **Step 1: Add imports**

In `apps/mobile/src/features/map-system/components/report-detail-sheet.tsx`, add after the existing imports (after line 17):

```tsx
import { SheetHero } from '@/features/map-system/components/sheet-hero';
```

- [ ] **Step 2: Replace the header block with the hero**

Replace the header `View` block (lines 64–83, the `<View className="flex-row items-start justify-between">...</View>` with crop eyebrow, disease title, severity badge, and close button) with:

```tsx
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <SheetHero
                  eyebrow={report.cropType}
                  title={report.disease ?? 'Unknown'}
                  metric={report.confidence != null ? `${Math.round(report.confidence)}%` : '—'}
                  metricCaption="confidence"
                  badge={<SeverityBadge severity={report.severity} size="sm" />}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={dismiss}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface"
              >
                <X size={18} color={theme.text} strokeWidth={2} />
              </Pressable>
            </View>
```

- [ ] **Step 3: Simplify the image/confidence card**

Since confidence now lives in the hero, replace the image+confidence card block (lines 85–113, the `<View className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-3">...</View>`) with a plain image card:

```tsx
            <View className="rounded-2xl border border-border bg-surface p-3">
              <Image
                source={{ uri: report.imageUrl }}
                style={{ width: '100%', height: 180, borderRadius: 12 }}
                contentFit="cover"
                transition={200}
              />
            </View>
```

- [ ] **Step 4: Verify lint + typecheck**

Run (from `apps/mobile`): `npx eslint src/features/map-system/components/report-detail-sheet.tsx`
Then: `pnpm typecheck`
Expected: both clean. If `ConfidenceRing` is now unused, remove its import (line 8); the hero shows confidence as a number instead.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/map-system/components/report-detail-sheet.tsx
git commit -m "feat(map): forest hero + bigger image in report detail sheet"
```

---

## Task 11: Final verification + visual checklist

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run (from `apps/mobile`): `pnpm typecheck`
Expected: exit 0, no errors.

- [ ] **Step 2: Lint all touched files**

Run (from `apps/mobile`):

```bash
npx eslint src/features/map-system/components/map-marker.tsx src/features/map-system/components/map-controls.tsx src/features/map-system/components/map-search-bar.tsx src/features/map-system/components/sheet-hero.tsx src/features/map-system/components/sheet-stat-card.tsx src/features/map-system/components/report-detail-sheet.tsx src/features/map-system/utils/marker-colors.ts src/features/outbreak-system/components/outbreak-zone-layer.tsx src/features/outbreak-system/components/outbreak-detail-sheet.tsx "src/app/(app)/map.tsx" src/theme/colors.ts src/theme/shadows.ts
```

Expected: no errors.

- [ ] **Step 3: Manual visual checklist (run the app: `pnpm dev`, open the Map tab)**

Confirm each (the success criteria from the spec):
- Crop emojis render fully at all zoom levels — pinch in/out near a marker, no clipping.
- Report markers, outbreak hubs, and clusters read as one teardrop family.
- Outbreak zones show a smooth radial glow (no visible opacity banding) with a boundary ring and a count badge on the hub.
- Controls are a single glass capsule (locate / layers / filter); no duplicate filter button; search bar is glass.
- Tapping an outbreak hub opens a sheet led by a forest hero with the big report count + tonal stat cards.
- Tapping a report marker opens a sheet led by a forest hero with confidence + the image.
- No marker flickers or animates its core appearance.

- [ ] **Step 4: Note the now-unused `HotspotAnimation`**

`apps/mobile/src/features/outbreak-system/components/hotspot-animation.tsx` is no longer imported by the zone layer. Leave it in place (it is still exported from the components `index.ts`); removing it is unrelated cleanup outside this plan's scope. If the reviewer wants it gone, that is a separate one-line deletion.

- [ ] **Step 5: Final confirmation**

All tasks complete, typecheck + lint clean, visual checklist passed. The map experience overhaul is done.

---

## Self-Review

**Spec coverage:**
- §2 clipping root cause → Tasks 3, 4, 5 (static teardrops, anchor, no animation).
- §3.1 teardrop markers → Task 3.
- §3.2 gradient-glow zones → Tasks 2, 5.
- §3.3 glass capsule controls + dedup filter → Tasks 6, 7.
- §3.4 forest-hero sheets → Tasks 8, 9, 10.
- §4 token additions → Tasks 1, 2.
- §5 component table → all covered (the spec listed `theme/global.css`; no map component uses new utility classes — all new tokens are consumed via JS `lightColors`/inline styles — so a `global.css` edit is not needed and is intentionally omitted).
- §7 success criteria → Task 11 checklist.

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output.

**Type consistency:** `mapSeverityFill` and `zoneGlowSteps` (Task 2) are consumed with matching signatures in Tasks 3 and 5. `SheetHero` props (`eyebrow/title/metric/metricCaption/badge`) match call sites in Tasks 9 and 10. `SheetStatCard` props (`value/label/tone`) match Task 9 usage. `MapMarker` keeps `enablePulse` optional so the `map.tsx` call site (unchanged) still typechecks. `MapSearchBar` drops `onPressFilter` in both the component and its call site (Task 7).
