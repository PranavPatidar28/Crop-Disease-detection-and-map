# AgroRadar — Premium UI/UX Overhaul

**Date:** 2026-06-08
**Status:** Approved direction, pending spec review
**Scope:** Full visual overhaul of the mobile app (`apps/mobile`). Backend untouched.

---

## 1. Goal

Make AgroRadar feel genuinely premium across every screen. This is a **full visual overhaul** — we are replacing the current "Soft Sage" execution with a new, cohesive design language while keeping the app's information architecture, navigation, and features intact.

The new language synthesizes four references the user identified as premium:

- **Apple-native** — restraint, generous whitespace, calm hierarchy, system type for UI.
- **Fintech (Revolut / Cash App)** — confident data display, big bold numbers, a hero "score" surface.
- **Material 3** — rounded tonal surfaces, layered elevation, soft shadows.
- **Editorial / luxury (Aesop)** — a serif headline voice for warmth and character.

Approved via mockup `synthesis.html` in the brainstorming session.

---

## 2. Design Language

### 2.1 Palette

Light-only (consistent with the current app). The shift from today: a **warmer paper canvas**, a **deep-forest hero surface** color, a single confident **emerald** accent, and **amber** for warning/severity.

| Token | Value | Role |
|---|---|---|
| `canvas` | `#f6f4ee` | App background — warm paper neutral (replaces `#fbfaf7`) |
| `surface` | `#ffffff` | Cards, sheets |
| `surface-sunken` | `#fdf6ec` | Tonal/tinted cards (e.g. warning stat) |
| `forest` | `#0f3d2e` | Hero surfaces, dark feature cards |
| `forest-700` | `#13503a` | Hero gradient end |
| `brand-500` | `#10b981` | Primary accent / CTA (kept) |
| `brand-300` | `#7fe6bf` | On-forest accents, sparklines |
| `amber` | `#b45309` | Warning / elevated severity |
| `amber-tint` | `#fdf6ec` | Warning card surface |
| `danger` | `#b91c1c` | High severity (kept) |
| `danger-tint` | `#fee2e2` | High severity surface (kept) |
| `text` | `#23291f` | Primary text (warmer charcoal, replaces `#0b1220`) |
| `text-muted` | `#8a8472` | Secondary text (warmer taupe, replaces slate) |
| `text-faint` | `#a59a82` | Labels, timestamps |
| `border` | `#ece6d9` | Hairline borders |

The existing brand ramp (`brand-50`..`brand-900`) and status tints are largely retained; the **neutrals are what change most** (warmer paper + taupe text instead of cool off-white + slate). The deep-forest and on-forest-accent tokens are new.

### 2.2 Typography

Two families:

- **Headlines / section titles → serif.** Editorial warmth. `ui-serif` (New York) is iOS-only; for cross-platform consistency we **bundle a serif via `expo-font`**. Recommendation: **Fraunces** (variable, characterful) or **Lora** (safe, lighter). *Decision flagged for spec review — see §6.*
- **UI, data, body → system sans.** SF Pro on iOS, Roboto on Android (current behavior). Big numbers use heavy weights (800).

Scale stays close to the current `theme/typography.ts` size ramp; what changes is **assigning serif to display/headline roles** and pushing data numbers to larger, bolder settings.

### 2.3 Shape & Elevation

- **Radii:** larger and softer. Hero/feature cards `28px`, standard cards `20px`, list rows `18px`, pills/badges `9–11px`. Extend `theme/radii.ts` accordingly.
- **Shadows:** layered, soft, low-opacity, warm-tinted (`rgba(40,46,38,.06)` for cards, deeper colored shadows for the hero `rgba(15,61,46,.34)` and CTA `rgba(16,185,129,.32)`). Replace/extend `theme/shadows.ts`.
- **Spacing:** more generous. Screen gutters `16px`, inter-section gap `20–24px`, comfortable card padding (`15–20px`).

### 2.4 Motion

Keep the existing reanimated entrance pattern (staggered `FadeInDown`) but standardize timing/curves through `theme/animations.ts`. Add: subtle press-scale on all tappable cards (the `pressable-scale` primitive already exists — apply it consistently), and animate hero numbers/rings on mount where it reads as premium, not gratuitous.

### 2.5 Signature components

- **Hero data card** — deep-forest gradient surface with a primary metric (big bold number), a supporting label, a progress ring, and a sparkline. Home uses it for a "Field Health" score.
- **Tonal stat cards** — rounded surfaces, big number + small caption; tint conveys status (white = neutral, `surface-sunken`/amber = warning, danger-tint = high).
- **Primary CTA** — emerald rounded card with title, subtitle, and a circular trailing affordance; colored soft shadow.
- **List row** — white rounded row: emoji/icon chip, title + meta, trailing severity badge.

---

## 3. Implementation Foundation

The visual system is defined **once** in tokens and consumed everywhere. Order of work:

1. **Tokens first.** Update `src/global.css` CSS variables and the mirrored TS in `src/theme/*` (`colors.ts`, `radii.ts`, `shadows.ts`, `typography.ts`, `animations.ts`). These are the single source of truth; most screen changes then fall out of using the new tokens.
2. **Font loading.** Add the chosen serif via `expo-font` in the root layout boot sequence; expose it through the typography tokens and `@/tw` wrappers.
3. **Shared primitives.** Update `src/components/ui/*` (button, card, chip, input, avatar, skeleton, etc.) and layout primitives to the new language. Introduce the signature components (hero data card, tonal stat card) where reusable.
4. **Screen-by-screen application** (§4), inheriting from the updated tokens + primitives.

Constraint: styling is **NativeWind v5 + Tailwind v4** via the `@/tw` wrapper and utility classes referencing tokens. JS-side visuals (gradients, SVG rings/sparklines, reanimated) read from `src/theme/*`. Keep both in sync.

This is Expo SDK 56 / RN 0.85 — per `apps/mobile/AGENTS.md`, verify any API against the v56 docs before writing native-touching code (fonts, etc.).

---

## 4. Screen-by-Screen Application

Each screen adopts the new tokens, type roles, radii, shadows, and signature components. Specific intent per screen:

- **Home dashboard** (`(app)/index.tsx` + `features/dashboard/*`) — serif greeting; **Field Health hero card** (score + ring + sparkline); tonal stat row (outbreaks near you / peak severity); emerald "Scan a crop" CTA; serif "Recent reports" section with rounded list rows. This is the flagship screen.
- **Map** (`(app)/map.tsx` + `features/map-system/*`, `outbreak-system/*`) — glass floating controls refined to the new shadow/radii language; severity-colored markers aligned to the new status palette; detail sheets restyled as rounded tonal surfaces with big-number stats.
- **Upload / report flow** (`(app)/upload.tsx`, `features/upload-report/*`, `features/report-flow/*`) — capture, crop picker, location, notes, and the analyze→result→submitted flow restyled. Result screen uses the hero-card treatment for the confidence ring + severity.
- **Disease analysis result** (`reports/[id].tsx` + `features/disease-analysis/*`) — confidence ring and severity badge promoted to a hero surface; recommendation cards as rounded tonal cards. (Note the overlap with `report-flow`; confirm which is wired to the live route before editing — flagged in exploration.)
- **Notifications** (`(app)/notifications.tsx` + `features/notifications/*`) — rounded notification cards, refined filter chips, day labels as quiet serif/label type, in-app banner restyle, tab-bar unread badge.
- **Profile & plots** (`(app)/profile.tsx` + `features/plots/*`) — serif section headers, plot cards in the new card language, form sheets restyled.
- **Auth & onboarding** (`(auth)/*`, `(onboarding)/*` + `features/auth/*`) — first impression; serif headlines, refined inputs and OTP cells, emerald CTAs on the warm canvas.
- **Navigation** (`components/navigation/tab-bar.tsx`) — floating glass tab bar refined to the new radii/shadow/accent; center FAB in emerald.
- **System states** (`components/feedback/*`, `offline-sync/*`, `toast/*`, skeletons) — empty states, offline banner, sync indicator, toasts, and shimmer skeletons all updated to the new tokens so loading/empty/error states feel premium too.

---

## 5. Out of Scope

- Backend, API contracts, data models.
- Information architecture and navigation structure (routes, tabs, flows stay as-is).
- New features or functionality. This is presentation-layer only.
- Dark mode (app stays light-only; we keep the existing type shape for backwards compat).

---

## 6. Open Decisions (for spec review)

1. **Serif font choice & sourcing.** Recommendation: bundle **Fraunces** (premium, editorial, variable) via `expo-font`. Alternative: **Lora** (lighter, safer) or rely on platform `ui-serif` (inconsistent across Android — not recommended for a "premium" bar). Adds a font asset to the bundle.
2. **Serif usage breadth.** Headlines + section titles only (recommended), vs. a heavier editorial treatment. More serif = more character but less "app-native."
3. **Hero "Field Health" score.** The mockup shows a single composite score. Confirm we can derive a sensible score from existing data (reports/outbreaks/plots) or whether it should be a simpler metric (e.g., "Outbreaks nearby") to avoid implying data we don't have.

---

## 7. Success Criteria

- Every screen visibly reflects the new language (canvas, serif headlines, tonal rounded cards, layered shadows, consistent spacing).
- Tokens are the single source of truth; no hardcoded one-off colors/radii in screens.
- Loading, empty, and error states are styled to the same bar as populated states.
- No regression in functionality, navigation, or accessibility (touch targets ≥ 44px, sufficient contrast).
- Builds and runs on Expo SDK 56 without new type errors.
