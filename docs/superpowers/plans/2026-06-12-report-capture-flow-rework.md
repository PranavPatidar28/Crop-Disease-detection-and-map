# Report / Capture Flow Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the disease-report flow out of the tab navigator into a full-screen modal route so the camera's shutter/gallery controls are no longer hidden behind the floating tab bar, and make the flash control give live feedback via the torch.

**Architecture:** The flow currently lives at `(app)/upload.tsx`, a tab screen. The custom floating `TabBar` is absolutely positioned over every tab screen and covers the camera's bottom controls. We relocate the flow's driver to a root-stack route `app/report.tsx` (registered in the root `Stack` with a slide-from-bottom animation, mirroring the existing `reports/[id]` pattern). The center `+` FAB in the `TabBar` becomes a standalone action that pushes `/report`. The capture screen's three-way flash cycle becomes a simple torch on/off toggle driving `CameraView`'s `enableTorch` (live light) plus `flash` (capture-time).

**Tech Stack:** Expo SDK 56, expo-router ~56.2.7, expo-camera ~56.0.7, expo-image-picker, React Native 0.85, TypeScript, pnpm workspace (mobile package name: `mobile`).

---

## Conventions

- All commands run from the repo root. The mobile package is filtered with `pnpm --filter mobile <script>`.
- Verification commands used throughout:
  - Typecheck: `pnpm --filter mobile typecheck`
  - Lint: `pnpm --filter mobile lint`
  - Unit tests: `pnpm --filter mobile test`
- **Testing note:** This change is structural (routing/navigation) and UI-overlay work against native modules (`expo-camera`, `expo-router`). Component-level unit tests here would require heavy mocking of native modules and would be brittle with low value, so they are intentionally not added. The existing Jest suite (utility + state-machine tests) is the automated regression gate, and `use-report-flow.ts` — the only logic-bearing module — is left untouched. Each task ends with typecheck + lint + the full Jest suite, plus explicit manual checks at the end.

---

## File Structure

- **Create:** `apps/mobile/src/app/report.tsx` — the full-screen report-flow driver (moved from `(app)/upload.tsx`), registered in the root stack.
- **Modify:** `apps/mobile/src/app/_layout.tsx` — register the new `report` screen in the root `Stack` with `slide_from_bottom`.
- **Modify:** `apps/mobile/src/app/(app)/_layout.tsx` — remove the `upload` `Tabs.Screen`.
- **Delete:** `apps/mobile/src/app/(app)/upload.tsx` — replaced by `app/report.tsx`.
- **Modify:** `apps/mobile/src/components/navigation/tab-bar.tsx` — render the four real tabs and inject a standalone center FAB that pushes `/report`.
- **Modify:** `apps/mobile/src/features/report-flow/screens/capture-screen.tsx` — replace flash cycle with a torch on/off toggle.
- **Modify:** `apps/mobile/src/features/dashboard/components/quick-upload-cta.tsx` — point at `/report`.
- **Modify:** `apps/mobile/src/app/reports/[id].tsx` — point "upload another" at `/report`.

---

## Task 1: Create the full-screen `/report` route

Create `app/report.tsx` as a copy of the current `(app)/upload.tsx` driver, with the "report another" navigation target changed from `/upload` to `/report`, and register it in the root stack. Both `/upload` and `/report` coexist after this task so the build stays green.

**Files:**
- Create: `apps/mobile/src/app/report.tsx`
- Modify: `apps/mobile/src/app/_layout.tsx:126-129` (the `Stack.Screen` list)

- [ ] **Step 1: Create `app/report.tsx`**

```tsx
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { analyzeImage } from '@/features/disease-analysis/api';
import {
  AnalyzingScreen,
  EditDetailsSheet,
  ResultScreen,
  SubmittedScreen,
} from '@/features/report-flow';
import { CaptureScreen } from '@/features/report-flow/screens/capture-lazy';
import type { EditDetailsSheetHandle } from '@/features/report-flow/components/edit-details-sheet';
import { useReportFlow } from '@/features/report-flow/use-report-flow';
import { useCurrentLocation } from '@/features/upload-report/hooks';
import { View } from '@/tw';

/**
 * Full-screen report flow. Lives in the root stack (outside the tab navigator)
 * so the floating tab bar never covers the camera controls and the user cannot
 * switch tabs mid-capture. Drives a four-step state machine:
 * Capture → Analyzing → Result → Submitted, falling through
 * cloud → on-device → manual when an engine is unavailable.
 */
export default function ReportScreen() {
  const flow = useReportFlow({
    cloudAnalyze: (image, cropType) =>
      analyzeImage({ imageUrl: image.uri, cropType: cropType ?? undefined }),
  });

  const editSheetRef = useRef<EditDetailsSheetHandle>(null);

  const locationCtl = useCurrentLocation(true);
  useEffect(() => {
    if (locationCtl.location) {
      flow.setLocation({
        latitude: locationCtl.location.latitude,
        longitude: locationCtl.location.longitude,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.setLocation is stable
  }, [locationCtl.location]);

  const submitting =
    flow.create.state === 'uploading' || flow.create.state === 'compressing';

  let body: React.ReactNode = null;
  switch (flow.state.step) {
    case 'capture':
      body = <CaptureScreen onCaptured={flow.setImage} onCancel={flow.reset} />;
      break;
    case 'analyzing':
      body = flow.state.image ? <AnalyzingScreen image={flow.state.image} /> : <View />;
      break;
    case 'result':
      body =
        flow.state.image && flow.state.result ? (
          <ResultScreen
            image={flow.state.image}
            result={flow.state.result}
            shareToMap={flow.state.shareToMap}
            submitting={submitting}
            onShareChange={flow.setShare}
            onEdit={() => editSheetRef.current?.present()}
            onPickCandidate={(disease) =>
              flow.patchResult({ disease, candidates: undefined, confidence: 1 })
            }
            onConfirm={() => void flow.submit()}
          />
        ) : (
          <View />
        );
      break;
    case 'submitted':
      body = flow.state.result ? (
        <SubmittedScreen
          result={flow.state.result}
          cropType={flow.state.cropType}
          shareToMap={flow.state.shareToMap}
          reportId={flow.state.submittedReportId}
          onAnother={() => {
            flow.reset();
            router.replace('/report');
          }}
        />
      ) : (
        <View />
      );
      break;
  }

  return (
    <>
      {body}
      {flow.state.result ? (
        <EditDetailsSheet
          ref={editSheetRef}
          initial={flow.state.result}
          onSave={flow.patchResult}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 2: Register `report` in the root stack**

In `apps/mobile/src/app/_layout.tsx`, add a `Stack.Screen` for `report` alongside the existing `reports/[id]` entry. Find this block (around lines 126-129):

```tsx
        <Stack.Screen
          name="reports/[id]"
          options={{ animation: 'slide_from_bottom' }}
        />
```

Add the `report` screen directly after it:

```tsx
        <Stack.Screen
          name="reports/[id]"
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="report"
          options={{ animation: 'slide_from_bottom' }}
        />
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS (no type errors).

- [ ] **Step 4: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS (no new lint errors in `app/report.tsx`).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/app/report.tsx apps/mobile/src/app/_layout.tsx
git commit -m "feat(report): add full-screen /report route"
```

---

## Task 2: Remove the upload tab and make the FAB push `/report`

Remove the `upload` tab screen, delete `(app)/upload.tsx`, and restructure `TabBar` to render the four real tabs with a standalone center FAB that pushes `/report`. These must happen together: the FAB is currently derived from the `upload` route, so removing the route without updating `TabBar` would drop the FAB.

**Files:**
- Modify: `apps/mobile/src/app/(app)/_layout.tsx:39`
- Delete: `apps/mobile/src/app/(app)/upload.tsx`
- Modify: `apps/mobile/src/components/navigation/tab-bar.tsx`

- [ ] **Step 1: Remove the `upload` tab screen**

In `apps/mobile/src/app/(app)/_layout.tsx`, delete this line (line 39):

```tsx
      <Tabs.Screen name="upload" options={{ title: 'Report' }} />
```

The remaining `Tabs.Screen` entries (`index`, `map`, `notifications`, `profile`) stay as-is.

- [ ] **Step 2: Delete the old upload route**

```bash
git rm apps/mobile/src/app/(app)/upload.tsx
```

- [ ] **Step 3: Restructure `TabBar` to inject a standalone FAB**

Replace the entire body of `apps/mobile/src/components/navigation/tab-bar.tsx` with the version below. Changes from the original: import `router` from `expo-router`; remove the `ROUTE_TO_ICON['upload']`/`ROUTE_TO_LABEL['upload']` entries and the in-loop `isFab` branch; render the real tabs split around a center `FabTab`; `FabTab` now takes only the navigation action (push `/report`).

```tsx
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/ui/pressable-scale';
import { NotificationBadge } from '@/features/notifications/components/notification-badge';
import { useUnreadCount } from '@/features/notifications/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { palette } from '@/theme/colors';
import { View } from '@/tw';

import { TabBarIcon, type TabIconName } from './tab-bar-icon';

const ROUTE_TO_ICON: Record<string, TabIconName> = {
  index: 'house',
  map: 'map',
  notifications: 'bell',
  profile: 'user',
};

const ROUTE_TO_LABEL: Record<string, string> = {
  index: 'Home',
  map: 'Map',
  notifications: 'Alerts',
  profile: 'Profile',
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadCount();

  const renderTab = (route: BottomTabBarProps['state']['routes'][number], index: number) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;
    const iconName = ROUTE_TO_ICON[route.name] ?? 'house';
    const label = ROUTE_TO_LABEL[route.name] ?? route.name;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    const onLongPress = () => {
      navigation.emit({ type: 'tabLongPress', target: route.key });
    };

    const tint = isFocused ? theme.primary : theme.textSubtle;

    return (
      <RegularTab
        key={route.key}
        accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
        isFocused={isFocused}
        iconName={iconName}
        label={label}
        tint={tint}
        onPress={onPress}
        onLongPress={onLongPress}
        badge={
          iconName === 'bell' && unreadCount > 0 ? (
            <NotificationBadge count={unreadCount} size="sm" />
          ) : null
        }
      />
    );
  };

  // Split the real tabs around a standalone center FAB:
  // [index, map] [FAB] [notifications, profile].
  const midpoint = Math.ceil(state.routes.length / 2);
  const leftTabs = state.routes.slice(0, midpoint);
  const rightTabs = state.routes.slice(midpoint);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: insets.bottom > 0 ? insets.bottom : 12,
      }}
    >
      <View
        className="flex-row items-center justify-between rounded-[22px] border border-border bg-surface px-2 py-2"
        style={{
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        {leftTabs.map((route) => renderTab(route, state.routes.indexOf(route)))}
        <FabTab
          label="New report"
          onPress={() => router.push('/report')}
        />
        {rightTabs.map((route) => renderTab(route, state.routes.indexOf(route)))}
      </View>
    </View>
  );
}

interface RegularTabProps {
  accessibilityLabel: string;
  isFocused: boolean;
  iconName: TabIconName;
  label: string;
  tint: string;
  onPress: () => void;
  onLongPress: () => void;
  badge: React.ReactNode;
}

function RegularTab({
  accessibilityLabel,
  isFocused,
  iconName,
  label,
  tint,
  onPress,
  onLongPress,
  badge,
}: RegularTabProps) {
  const focused = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focused.value = withTiming(isFocused ? 1 : 0, { duration: 180 });
  }, [focused, isFocused]);

  const iconBgStyle = useAnimatedStyle(() => ({
    opacity: focused.value,
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      pressedScale={0.92}
      haptic="selection"
      className="flex-1 items-center justify-center gap-1 rounded-2xl px-2 py-2"
    >
      <View className="overflow-hidden rounded-lg" style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', inset: 0, borderRadius: 8, overflow: 'hidden' },
            iconBgStyle,
          ]}
        >
          <LinearGradient
            colors={[`${palette.brand[500]}26`, `${palette.brand[600]}26`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
        </Animated.View>
        <View>
          <TabBarIcon name={iconName} focused={isFocused} color={tint} size={20} />
          {badge ? (
            <View style={{ position: 'absolute', top: -4, right: -8 }}>{badge}</View>
          ) : null}
        </View>
      </View>
      <Text
        className="text-[10px] font-bold"
        style={{ color: tint, letterSpacing: 0.3 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

interface FabTabProps {
  label: string;
  onPress: () => void;
}

/**
 * The center "Report" raised FAB. No longer a tab — it's a standalone action
 * that opens the full-screen report flow. Sits ~16px above the bar with a
 * brand-tinted shadow, gradient background, and a 3px white ring.
 */
function FabTab({ label, onPress }: FabTabProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onPress();
      }}
      haptic="none"
      pressedScale={0.92}
      className="items-center"
      style={{ transform: [{ translateY: -16 }], width: 56 }}
    >
      <View
        className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-surface"
        style={{
          shadowColor: palette.brand[600],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <LinearGradient
          colors={[palette.brand[500], palette.brand[600]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <TabBarIcon name="plus" focused color="#ffffff" size={26} />
      </View>
    </PressableScale>
  );
}
```

> Note: the original imported `Text` from `@/tw`. The replacement above still uses `<Text>` in `RegularTab`, so keep `Text` in the `@/tw` import. Verify the import line reads `import { Text, View } from '@/tw';` — if your paste dropped `Text`, restore it.

- [ ] **Step 4: Fix the `@/tw` import**

Ensure the import in `tab-bar.tsx` includes both `Text` and `View`:

```tsx
import { Text, View } from '@/tw';
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS. (If it reports `Cannot find name 'Text'`, fix Step 4.)

- [ ] **Step 6: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS.

- [ ] **Step 7: Run unit tests**

Run: `pnpm --filter mobile test`
Expected: PASS (existing suite unaffected).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/app/(app)/_layout.tsx apps/mobile/src/components/navigation/tab-bar.tsx
git commit -m "feat(report): open report flow from tab-bar FAB, drop upload tab"
```

---

## Task 3: Repoint remaining `/upload` navigation references

Two other call sites still navigate to `/upload`. Point them at `/report`.

**Files:**
- Modify: `apps/mobile/src/features/dashboard/components/quick-upload-cta.tsx:14`
- Modify: `apps/mobile/src/app/reports/[id].tsx:152`

- [ ] **Step 1: Update the dashboard quick-upload CTA**

In `apps/mobile/src/features/dashboard/components/quick-upload-cta.tsx`, change:

```tsx
      onPress={() => router.push('/upload')}
```

to:

```tsx
      onPress={() => router.push('/report')}
```

- [ ] **Step 2: Update the report-detail "upload another" action**

In `apps/mobile/src/app/reports/[id].tsx`, change:

```tsx
                  onUploadAnother={() => router.replace('/upload')}
```

to:

```tsx
                  onUploadAnother={() => router.replace('/report')}
```

- [ ] **Step 3: Confirm no `/upload` route references remain**

Run a search for any leftover route navigation to `/upload` (the `upload-report` feature *folder* imports are unrelated and must stay):

Run: `pnpm --filter mobile exec -- node -e "process.exit(0)"` is not needed — instead grep the source:

Search the codebase for `'/upload'` and `"/upload"` (string-literal route targets only). Expected result: **zero** matches. Imports from `@/features/upload-report/...` are a different path and should remain.

- [ ] **Step 4: Typecheck + lint**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.
Run: `pnpm --filter mobile lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/features/dashboard/components/quick-upload-cta.tsx apps/mobile/src/app/reports/[id].tsx
git commit -m "refactor(report): repoint /upload navigation to /report"
```

---

## Task 4: Replace the flash cycle with a live torch toggle

In `capture-screen.tsx`, replace the three-way Off/Auto/On flash cycle with a simple on/off toggle that drives `CameraView`'s `enableTorch` (live light, instant feedback) and sets `flash` to `'on'`/`'off'` so the captured photo also uses flash.

**Files:**
- Modify: `apps/mobile/src/features/report-flow/screens/capture-screen.tsx`

- [ ] **Step 1: Remove the flash-cycle constants**

Delete these lines (currently lines 25-33):

```tsx
/** Flash modes we cycle through with the toggle button: off → auto → on → off. */
const FLASH_CYCLE = ['off', 'auto', 'on'] as const;
type CycledFlash = (typeof FLASH_CYCLE)[number];

const FLASH_LABEL: Record<CycledFlash, string> = {
  off: 'Off',
  auto: 'Auto',
  on: 'On',
};
```

- [ ] **Step 2: Replace the flash state with a torch boolean**

Change (currently line 44):

```tsx
  const [flash, setFlash] = useState<CycledFlash>('off');
```

to:

```tsx
  const [torchOn, setTorchOn] = useState(false);
```

- [ ] **Step 3: Drive the live torch and capture flash on `CameraView`**

Change the `CameraView` element (currently lines 137-143):

```tsx
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        flash={flash}
        onCameraReady={() => setIsReady(true)}
      />
```

to:

```tsx
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
        enableTorch={torchOn}
        flash={torchOn ? 'on' : 'off'}
        onCameraReady={() => setIsReady(true)}
      />
```

- [ ] **Step 4: Replace the flash toggle button (granted-permission overlay)**

Change the top-bar flash `Pressable` (currently lines 167-181):

```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Flash ${FLASH_LABEL[flash]}`}
            onPress={() =>
              setFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % FLASH_CYCLE.length])
            }
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: flash === 'off' ? 'rgba(0,0,0,0.45)' : palette.brand[600] }}
          >
            {flash === 'off' ? (
              <ZapOff size={18} color="#ffffff" strokeWidth={2.4} />
            ) : (
              <Zap size={18} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />
            )}
          </Pressable>
```

to:

```tsx
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: torchOn }}
            accessibilityLabel={torchOn ? 'Turn flash off' : 'Turn flash on'}
            onPress={() => setTorchOn((on) => !on)}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: torchOn ? palette.brand[600] : 'rgba(0,0,0,0.45)' }}
          >
            {torchOn ? (
              <Zap size={18} color="#ffffff" strokeWidth={2.4} fill="#ffffff" />
            ) : (
              <ZapOff size={18} color="#ffffff" strokeWidth={2.4} />
            )}
          </Pressable>
```

- [ ] **Step 5: Update the framing-hint label**

Change the hint text (currently lines 190-192):

```tsx
            <Text className="text-xs font-medium text-white">
              Frame the affected leaf · flash {FLASH_LABEL[flash]}
            </Text>
```

to:

```tsx
            <Text className="text-xs font-medium text-white">
              Frame the affected leaf · flash {torchOn ? 'on' : 'off'}
            </Text>
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: PASS. (Confirms no lingering `flash`/`FLASH_CYCLE`/`FLASH_LABEL`/`CycledFlash` references remain.)

- [ ] **Step 7: Lint**

Run: `pnpm --filter mobile lint`
Expected: PASS (no unused-import warnings for `Zap`/`ZapOff` — both are still used).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/features/report-flow/screens/capture-screen.tsx
git commit -m "feat(report): live torch toggle for camera flash"
```

---

## Task 5: Final verification

- [ ] **Step 1: Full automated gate**

Run: `pnpm --filter mobile typecheck`
Expected: PASS.
Run: `pnpm --filter mobile lint`
Expected: PASS.
Run: `pnpm --filter mobile test`
Expected: PASS.

- [ ] **Step 2: Manual device/simulator checks**

Start the app (`pnpm --filter mobile dev`) and verify:
- Tapping the center `+` FAB opens the report flow full-screen with a slide-from-bottom animation.
- On the camera step, **all four controls are visible and tappable**: close (top-left), flash (top-right), gallery (bottom-left), shutter (bottom-center). None are covered by a tab bar.
- No tab bar is visible while in the report flow, and you cannot switch tabs mid-capture.
- Tapping the flash button toggles the device torch **on/off live** (the light turns on immediately, not only at capture).
- Capturing a photo (or picking from gallery) advances to the Analyzing screen.
- Completing a report and choosing "Report another" restarts the flow; "View on map" / "View this report" navigate correctly.
- The dashboard "quick upload" CTA opens the same full-screen flow.

- [ ] **Step 3: Confirm the report flow still works from the report-detail screen**

From an existing report detail (`reports/[id]`), trigger "upload another" and confirm it opens `/report` full-screen.

---

## Self-Review Notes

- **Spec coverage:** Routing move (Tasks 1-2), FAB action (Task 2), `/upload` repointing (Task 3), torch toggle (Task 4), verification (Task 5) — every spec section maps to a task.
- **Type consistency:** `torchOn`/`setTorchOn` introduced in Task 4 Step 2 are used consistently in Steps 3-5. `FabTab` signature reduced to `{ label, onPress }` in Task 2 Step 3 and called with exactly those props.
- **No placeholders:** every code step contains full code; commands include expected output.
