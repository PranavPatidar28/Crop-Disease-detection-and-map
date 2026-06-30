# Farmer Feedback on Advisory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a demo-only "Was this helpful?" feedback card to the report detail screen so a farmer can rate whether the advisory helped and leave an optional comment.

**Architecture:** A self-contained `ReportFeedback` component holds all state locally (`vote`, `comment`, `submitted`) and walks through three visual states (prompt → vote-selected → thank-you). Pure presentation logic (deriving the thank-you confirmation line from a vote) is extracted into a tiny testable helper so it can be unit-tested under the repo's logic-only Jest setup. The card is dropped into `reports/[id].tsx` in the finished-result branch.

**Tech Stack:** React Native + Expo (SDK 56), NativeWind/Tailwind classes via `@/tw`, `lucide-react-native` icons, `expo-haptics`, existing UI primitives (`Card`, `SectionLabel`, `PressableScale`, `Button`, `TextButton`). Jest (babel-jest, node env) for the helper test.

---

## Constraints & conventions (read first)

- **Demo scope only.** Local component state. No API, no store, no AsyncStorage, no persistence. State resets on unmount.
- **Testing reality:** `apps/mobile/jest.config.js` only matches `src/**/*.test.ts` (NOT `.tsx`) and runs in a `node` environment with no React Native runtime. Component/hook tests are out of scope (would need jest-expo). Therefore: extract pure logic into a `.ts` helper and unit-test that; verify the component itself via `tsc --noEmit` + `expo lint` + manual review.
- **Strings:** `reports/[id].tsx` uses plain English strings (e.g. "Report", "Advisory"), NOT the `t()` i18n keys used on other screens. Match that — use plain English strings in this feature. Do not wire i18n.
- **Imports:** Use `@/tw` for `Text`, `View`, `TextInput`. Use `@/theme/colors` `palette` for icon colors. Use `@/hooks/use-theme` `useTheme()` for the TextInput's `placeholderTextColor`/text color (matches `input.tsx`, `notes-input.tsx`).
- **All commands run from the worktree:** `C:\Users\prana\AppData\Local\Temp\opencode\farmer-feedback` (relocated out of `.worktrees/` because Jest's matcher silently skips dot-prefixed path segments, finding 0 tests). The mobile app is at `apps/mobile`.

---

## File structure

- **Create** `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.ts` — pure helper: `feedbackConfirmation(vote)` returns the thank-you headline string. One responsibility: vote → copy.
- **Create** `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.test.ts` — unit tests for the helper (logic-only, runs under existing Jest).
- **Create** `apps/mobile/src/features/disease-analysis/components/report-feedback.tsx` — the `ReportFeedback` component (all three states, local state).
- **Modify** `apps/mobile/src/features/disease-analysis/components/index.ts` — add barrel export.
- **Modify** `apps/mobile/src/app/reports/[id].tsx` — render `<ReportFeedback />` after `ResultActions`; bump the disclaimer's entering delay so it stays last.

---

## Task 1: Pure feedback-copy helper (TDD)

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.ts`
- Test: `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.test.ts`:

```ts
import { feedbackConfirmation, type FeedbackVote } from './report-feedback.helpers';

describe('feedbackConfirmation', () => {
  it('returns the positive line for an up vote', () => {
    expect(feedbackConfirmation('up')).toBe('You found this helpful');
  });

  it('returns the negative line for a down vote', () => {
    expect(feedbackConfirmation('down')).toBe("You said this didn't help");
  });

  it('accepts the FeedbackVote type for both values', () => {
    const votes: FeedbackVote[] = ['up', 'down'];
    expect(votes.map(feedbackConfirmation)).toEqual([
      'You found this helpful',
      "You said this didn't help",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter mobile exec jest src/features/disease-analysis/components/report-feedback.helpers.test.ts`
Expected: FAIL — cannot find module `./report-feedback.helpers` (file not yet created).

- [ ] **Step 3: Write the minimal implementation**

Create `apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.ts`:

```ts
/** Which thumb the farmer selected for the advisory feedback. */
export type FeedbackVote = 'up' | 'down';

/**
 * Thank-you headline echoing the farmer's choice back to them. Kept as a pure
 * function so it can be unit-tested under the repo's logic-only Jest setup
 * (component rendering is out of that scope).
 */
export function feedbackConfirmation(vote: FeedbackVote): string {
  return vote === 'up' ? 'You found this helpful' : "You said this didn't help";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter mobile exec jest src/features/disease-analysis/components/report-feedback.helpers.test.ts`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.ts apps/mobile/src/features/disease-analysis/components/report-feedback.helpers.test.ts
git commit -m "feat(feedback): add pure feedback-copy helper with tests"
```

---

## Task 2: ReportFeedback component

**Files:**
- Create: `apps/mobile/src/features/disease-analysis/components/report-feedback.tsx`

- [ ] **Step 1: Write the component**

Create `apps/mobile/src/features/disease-analysis/components/report-feedback.tsx`:

```tsx
import * as Haptics from 'expo-haptics';
import { Check, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionLabel } from '@/components/ui/section-label';
import { TextButton } from '@/components/ui/text-button';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';

import { feedbackConfirmation, type FeedbackVote } from './report-feedback.helpers';

const COMMENT_MAX = 300;

/**
 * Demo-only "Was this helpful?" card for the report detail screen. All state is
 * local: it resets when the screen unmounts. No API / store wiring yet — that's
 * a future iteration. Strings are plain English to match `reports/[id].tsx`.
 */
export function ReportFeedback() {
  const theme = useTheme();
  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const selectVote = (next: FeedbackVote) => {
    Haptics.selectionAsync().catch(() => undefined);
    setVote(next);
  };

  const submit = () => {
    if (!vote) return;
    Haptics.selectionAsync().catch(() => undefined);
    setSubmitted(true);
  };

  // State C — thank-you confirmation.
  if (submitted && vote) {
    return (
      <Card padding="md">
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-100">
            <Check size={18} color={palette.brand[700]} strokeWidth={2.6} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-text">Thanks for your feedback</Text>
            <Text className="text-sm text-text-muted">{feedbackConfirmation(vote)}</Text>
            {comment.trim().length > 0 ? (
              <Text className="mt-1 text-sm leading-5 text-text">
                &ldquo;{comment.trim()}&rdquo;
              </Text>
            ) : null}
            <TextButton
              label="Edit"
              size="sm"
              className="mt-2"
              onPress={() => setSubmitted(false)}
            />
          </View>
        </View>
      </Card>
    );
  }

  // States A & B — prompt and (once voted) comment + submit.
  return (
    <Card padding="md">
      <View className="gap-3">
        <SectionLabel>Was this helpful?</SectionLabel>

        <View className="flex-row gap-2">
          <VoteButton
            label="Yes"
            icon={
              <ThumbsUp
                size={18}
                color={vote === 'up' ? '#fff' : palette.brand[700]}
                strokeWidth={2.2}
              />
            }
            selected={vote === 'up'}
            onPress={() => selectVote('up')}
          />
          <VoteButton
            label="No"
            icon={
              <ThumbsDown
                size={18}
                color={vote === 'down' ? '#fff' : palette.brand[700]}
                strokeWidth={2.2}
              />
            }
            selected={vote === 'down'}
            onPress={() => selectVote('down')}
          />
        </View>

        {vote ? (
          <View className="gap-3">
            <View className="rounded-xl border border-border bg-surface px-3 py-2">
              <TextInput
                value={comment}
                onChangeText={(next) =>
                  next.length <= COMMENT_MAX ? setComment(next) : undefined
                }
                placeholder="Add a comment (optional)"
                placeholderTextColor={theme.textFaint}
                multiline
                textAlignVertical="top"
                style={{ minHeight: 64, color: theme.text, fontSize: 15, lineHeight: 22 }}
              />
            </View>
            <Button label="Submit" onPress={submit} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function VoteButton({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic="none"
      pressedScale={0.96}
      className="flex-1"
    >
      <View
        className={
          selected
            ? 'flex-row items-center justify-center gap-2 rounded-2xl border border-brand-600 bg-brand-600 px-3 py-3'
            : 'flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-3 py-3'
        }
      >
        {icon}
        <Text className={selected ? 'text-sm font-bold text-white' : 'text-sm font-bold text-text'}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS — no type errors. (If `theme.textFaint` is reported missing, open `apps/mobile/src/hooks/use-theme.ts` and use the correct subtle-text key it exposes, e.g. `theme.textSubtle`, matching `notes-input.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/components/report-feedback.tsx
git commit -m "feat(feedback): add ReportFeedback demo card component"
```

---

## Task 3: Export and wire into the report detail screen

**Files:**
- Modify: `apps/mobile/src/features/disease-analysis/components/index.ts`
- Modify: `apps/mobile/src/app/reports/[id].tsx`

- [ ] **Step 1: Add the barrel export**

In `apps/mobile/src/features/disease-analysis/components/index.ts`, add this line (alphabetical order, after `recommendations-list`):

```ts
export * from './report-feedback';
```

The file should then read:

```ts
export * from './confidence-ring';
export * from './disease-advisory';
export * from './processing-state';
export * from './recommendations-list';
export * from './report-feedback';
export * from './result-actions';
export * from './result-hero';
export * from './severity-badge';
```

- [ ] **Step 2: Import the component in the detail screen**

In `apps/mobile/src/app/reports/[id].tsx`, add this import alongside the other `@/features/disease-analysis/components/*` imports (after the `RecommendationsList` import on line 19):

```tsx
import { ReportFeedback } from '@/features/disease-analysis/components/report-feedback';
```

- [ ] **Step 3: Render the card after ResultActions and bump the disclaimer delay**

In `apps/mobile/src/app/reports/[id].tsx`, find this block (lines ~182–195):

```tsx
              <AnimatedView entering={FadeInDown.delay(260).duration(400)}>
                <ResultActions
                  report={report}
                  onUploadAnother={() => router.replace('/report')}
                  onViewOnMap={() => router.push('/map')}
                />
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(320).duration(400)}>
                <Text className="px-2 text-[11px] text-text-subtle">
                  AI predictions are advisory. For high-severity diagnoses, consult your local
                  agricultural extension officer.
                </Text>
              </AnimatedView>
```

Replace it with (inserts the feedback card at `delay(300)`, pushes the disclaimer to `delay(360)`):

```tsx
              <AnimatedView entering={FadeInDown.delay(260).duration(400)}>
                <ResultActions
                  report={report}
                  onUploadAnother={() => router.replace('/report')}
                  onViewOnMap={() => router.push('/map')}
                />
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(300).duration(400)}>
                <ReportFeedback />
              </AnimatedView>

              <AnimatedView entering={FadeInDown.delay(360).duration(400)}>
                <Text className="px-2 text-[11px] text-text-subtle">
                  AI predictions are advisory. For high-severity diagnoses, consult your local
                  agricultural extension officer.
                </Text>
              </AnimatedView>
```

- [ ] **Step 4: Verify it typechecks**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/disease-analysis/components/index.ts apps/mobile/src/app/reports/[id].tsx
git commit -m "feat(feedback): wire ReportFeedback into report detail screen"
```

---

## Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the helper unit tests**

Run: `pnpm --filter mobile exec jest`
Expected: PASS — all tests green, including `report-feedback.helpers.test.ts`.

- [ ] **Step 2: Typecheck the whole app**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Lint**

Run: `pnpm --filter mobile exec expo lint`
Expected: PASS — no new lint errors in the created/modified files.

- [ ] **Step 4: Manual smoke check (record outcome)**

Start the app (`pnpm --filter mobile dev`), open any finished report, and confirm:
- The "Was this helpful?" card shows below the action buttons.
- Tapping Yes/No selects the thumb (brand fill) and reveals the comment box + Submit.
- Tapping the other thumb switches the selection.
- Submit collapses the card to "Thanks for your feedback" + the echo line (+ comment if entered).
- "Edit" returns to the vote/comment state with prior choices preserved.

Note in the task notes whether the manual check passed (and on which platform), or that it was skipped because no device/simulator was available.

- [ ] **Step 5: Commit any fixes**

If steps 1–3 surfaced fixes, commit them:

```bash
git add -A
git commit -m "fix(feedback): address verification findings"
```

If nothing changed, skip this step.

---

## Out of scope (future iterations)

- Backend mutation + persistence of feedback.
- Aggregating feedback for analytics / model improvement.
- i18n strings for the feedback card.
- Surfacing feedback outside the report detail screen.
