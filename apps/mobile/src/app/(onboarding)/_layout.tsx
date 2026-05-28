import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { usePlots } from '@/features/plots/hooks/use-plots';
import { useAuthStore } from '@/store/auth.store';

/**
 * Onboarding gate. After auth, send users without a name AND without plots
 * (and who haven't explicitly skipped) through the lite onboarding. Anyone
 * with at least one plot OR who's tapped "Skip" goes straight to the app.
 */
export default function OnboardingLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const { data: plots, isPending } = usePlots();

  const [skipped, setSkipped] = useState<boolean | null>(null);

  useEffect(() => {
    void onboardingStorage.getSkipped().then(setSkipped);
  }, []);

  if (!isHydrated || skipped === null) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;

  // User completed onboarding before, or skipped, or already has plots
  if (skipped || (user?.name && plots && plots.length > 0)) {
    return <Redirect href="/" />;
  }
  if (isPending) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
