# Map Experience UI Overhaul (Markers, Zones, Controls, Sheets)

**Date:** 2026-06-09
**Status:** Approved direction (brainstorm), pending spec review
**Scope:** The Map screen and its supporting features in `apps/mobile` — `features/map-system/*` and `features/outbreak-system/*`, plus the few theme tokens the map needs. Backend untouched.

---

## 1. Goal

Make the map screen feel premium and cohesive, and fix the crop-icon clipping bug. Today the markers look cheap, outbreak zones read weak, the floating controls/search are cluttered and off-brand, and the detail sheets lack hierarchy. We align the whole map experience to the approved premium language defined in `2026-06-08-agroradar-premium-ui-overhaul-design.md` (warm paper canvas, deep-forest hero surfaces, single emerald accent, tonal rounded cards, layered warm-tinted shadows).

All visual directions below were chosen via the brainstorming visual companion.

---

## 2. Root Cause: Crop-Icon Clipping

`react-native-maps` rasterizes a custom `<Marker>`'s children into a single bitmap. The bitmap is clipped to the marker view's bounds, and with `tracksViewChanges={false}` it is captured once. Two current patterns break under this:

1. **`MapMarker`** (`map-marker.tsx`) renders a HIGH-severity pulse ring that scales to `1 + pulse*1.4` — i.e. beyond its 48×48 container — so the ring (and sometimes the emoji edge) is clipped, and re-rasterization on zoom makes it worse.
2. **`OutbreakZoneLayer`** (already partially fixed) positioned a label outside bounds and relied on an animation that never renders in a static bitmap.

**Fix principle for all markers:** the marker's *static first frame* must be the complete intended look, every visual element must sit **inside** a padded bounds, and `tracksViewChanges` is held true briefly (to capture layout) then turned off. No reliance on continuous animation inside a marker bitmap.

---

## 3. Design Decisions (from brainstorm)

### 3.1 Markers — Refined Teardrop (option B)

A solid severity-colored teardrop pin with a white crop emoji and a tail anchored to the exact coordinate.

- Circular body ~40px, `borderRadius` full, 2.5px white border, severity-colored fill (`MapMarker`'s existing `SEVERITY_FILL`: LOW `#047857`, MEDIUM `#d97706`, HIGH `#dc2626`).
- A small rotated square "tail" beneath the body, same fill, pointing to the location. Marker `anchor={{ x: 0.5, y: 1 }}` so the tail tip marks the spot.
- Crop emoji centered (white-on-color reads cleanly). Fallback `🌿`.
- Warm layered shadow.
- **No pulse animation.** HIGH severity is conveyed by the red fill (and optional subtle static elevation), not motion — this removes the clipping source entirely.
- Wrapped in a padded container so border + shadow + tail are inside the bitmap bounds.
- `tracksViewChanges` true on mount/content-change, then false after ~600ms (the lint-safe adjust-state-on-prop-change + timeout pattern already used in `outbreak-zone-layer.tsx`).

Clusters (`MapCluster`) keep their gradient-bubble form but are retuned to the same shadow/border language so they read as the same family.

### 3.2 Outbreak Zones — Layered Radial Gradient Glow (option B + gradient)

The zone area reads as a real hotspot: intense at the epicenter, fading to nothing at the boundary.

- Since `react-native-maps` `Circle` has no gradient fill, build the glow from **~6 stacked concentric `Circle`s** with stepped opacity (densest/smallest at the core, faint/largest at the outer radius). Enough steps that there are no visible bands.
- A faint solid **boundary ring** `Circle` at the true outer radius marks the zone edge.
- Severity drives tint (emerald/amber/red) and core intensity (HIGH = denser core, MEDIUM/LOW progressively lighter).
- **Central hub = the refined teardrop** (§3.1) for family consistency, carrying a **report-count badge** (small white pill, severity-bordered, top-right of the body).
- **Remove** the always-on floating disease text label under the marker (clutters at scale). Disease name surfaces on tap in the detail sheet.
- Resolved (`!active`) zones render dimmed (lower opacity tint + ring), as today.
- Opacity steps are constants derived from severity; no animation.

### 3.3 Floating Controls + Search/Filter — Glass Capsule (option B)

- **Search bar:** frosted glass (`expo-glass-effect` `GlassView` on iOS, translucent white fallback on Android) with softer radius (~18px) and warm shadow. Keeps faux search field + connection/count pill on the right.
- **Right controls:** fuse the separate FABs into a **single floating glass capsule** with hairline dividers between actions: locate, layer-toggle, filter. Active state = emerald dot indicator (as today).
- **Remove the redundant filter button** that currently appears in *both* the search bar and the control stack — filter lives once, in the capsule. The search bar's right affordance opens the filter sheet.
- **Chip rail** (`MapFilterChips`) retuned to the premium chip language (warm surfaces, forest active state), unchanged in behavior.
- All shadows switch from the cool `#0f172a`/`#0f3d2e`-less values to **warm-tinted** shadows per the premium spec (`rgba(40,46,38,.12)` for surfaces).

### 3.4 Detail Sheets — Forest Hero (option A)

Applies to both `OutbreakDetailSheet` and `ReportDetailSheet` (shared language).

- **Hero card** at the top: deep-forest gradient surface (`#0f3d2e → #13503a`) with a colored soft shadow (`rgba(15,61,46,.34)`). Leads with the headline metric as a **big bold number** (outbreak: report count; report: confidence %), an uppercase emerald-tinted label, the title (disease), and a severity badge.
- **Tonal stat cards** below the hero: big number + uppercase caption; tint conveys status (danger-tint for high-severity counts, neutral warm surface otherwise). Outbreak stats: High severity, Radius, Last report. Report stats: distance, time, confidence detail.
- Affected-crops chips, mini-map preview (now rendering the §3.2 gradient zone), contributing-reports list, and prevention guidance remain below, restyled to rounded tonal cards.
- Sheet container: white, 24px top radii, warm hairline border, refined grabber — consistent across both sheets (the report sheet already does this; align the outbreak sheet to match instead of `theme.surfaceElevated`).

---

## 4. Theme Token Additions

The premium tokens this design needs do **not** exist yet (`colors.ts` is still "Soft Sage"; the full overhaul is approved but unimplemented). To keep the map shippable independently, add the specific tokens it uses, matching the values already blessed in the overhaul spec:

- `forest` `#0f3d2e`, `forestEnd` `#13503a` — hero gradient.
- `forestAccent` `#7fe6bf` — on-forest labels.
- Warm shadow presets (surface `rgba(40,46,38,.12)`, hero `rgba(15,61,46,.34)`, CTA `rgba(16,185,129,.32)`) — add to `theme/shadows.ts` (or inline constants if no shadow token file exists).
- Map marker severity fills already exist in `MapMarker`; promote them to a shared helper so markers, zone hubs, and badges stay in sync.

Add to `src/theme/colors.ts` (+ mirror in `global.css` if map components use utility classes). Keep JS-side (gradients, circles, shadows) and Tailwind sides in sync per the existing constraint. This is a **subset** of the full overhaul's token work — when the overhaul lands, these tokens are already in place and consistent.

This is Expo SDK 56 / RN 0.85: verify `expo-glass-effect` and any native-touching API against the v56 docs before coding (`apps/mobile/AGENTS.md`).

---

## 5. Components Affected

| File | Change |
|---|---|
| `outbreak-system/components/outbreak-zone-layer.tsx` | Stacked-circle gradient glow + boundary ring; teardrop hub w/ count badge; drop floating label |
| `map-system/components/map-marker.tsx` | Teardrop form + tail; remove pulse; padded bounds; shared severity-fill helper; retune cluster |
| `map-system/components/map-search-bar.tsx` | Glass treatment, softer radius, warm shadow; remove duplicate filter affordance logic |
| `map-system/components/map-controls.tsx` | Fuse FABs into one glass capsule w/ dividers; warm shadows |
| `map-system/components/map-filter-chips.tsx` | Retune chips to premium language |
| `outbreak-system/components/outbreak-detail-sheet.tsx` | Forest hero + tonal stat cards; align container styling |
| `map-system/components/report-detail-sheet.tsx` | Forest hero + tonal stat cards (shared language) |
| `app/(app)/map.tsx` | Update marker `anchor` for teardrop tail; wire any prop changes |
| `theme/colors.ts`, `theme/shadows.ts`, `global.css` | Add forest/accent tokens + warm shadow presets |
| `outbreak-system/components/hotspot-animation.tsx` | Becomes unused by the marker; leave in place (separate cleanup) |

---

## 6. Out of Scope

- Backend, API contracts, data models, socket events.
- Map provider, clustering algorithm, data fetching/polling logic.
- The full app-wide premium overhaul (separate spec) — we add only the tokens the map needs.
- New map features (search autocomplete, new filters, etc.). Presentation only.
- Serif font sourcing (the editorial-clean sheet option that needed it was not chosen).

---

## 7. Success Criteria

- Crop icons and all marker elements render fully at every zoom level — no clipping on Android or iOS.
- Markers (reports + outbreak hubs + clusters) read as one cohesive teardrop family.
- Outbreak zones read as intensity-falloff hotspots with a clear boundary; no visible opacity banding.
- Controls are a single glass capsule; no duplicate filter control; search bar is glass.
- Both detail sheets lead with a forest hero + big numbers + tonal stat cards.
- No marker relies on continuous animation for its appearance.
- Map tokens live in the theme (no one-off hardcoded colors/shadows in components).
- Touch targets ≥ 44px; severity remains distinguishable (color + position, not color alone where feasible).
- `pnpm typecheck` and `eslint` pass clean; no functional/navigation regressions.
