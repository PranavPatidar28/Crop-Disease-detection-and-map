import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SectionLabel } from '@/components/ui/section-label';
import { authApi } from '@/features/auth/api/auth.api';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { useAuthStore } from '@/store/auth.store';
import { AnimatedView, Text, View } from '@/tw';

export default function OnboardingNameScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError('Tell us what to call you.');
    setBusy(true);
    try {
      const updated = await authApi.updateMe({ name: trimmed });
      await setUser(updated);
      router.push('/first-plot');
    } catch (err) {
      setError((err as Error).message ?? 'Could not save your name');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    await onboardingStorage.setSkipped(true);
    router.replace('/');
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="px-4 pt-3">
            <SectionLabel>Step 1 of 2</SectionLabel>
          </View>

          <View className="flex-1 justify-center gap-3 px-4">
            <AnimatedView entering={FadeInDown.duration(400)} className="gap-2">
              <Text className="text-3xl font-extrabold tracking-tight text-text">
                What should we call you?
              </Text>
              <Text className="text-sm text-text-muted">
                Helps neighboring farmers recognize your reports.
              </Text>
            </AnimatedView>

            <AnimatedView entering={FadeInDown.delay(100).duration(400)}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ramesh Patil"
                autoCapitalize="words"
                error={error ?? undefined}
              />
            </AnimatedView>
          </View>

          <BottomActionBar divider={false} row gapClassName="gap-3">
            <Button label="Skip" variant="ghost" size="lg" onPress={handleSkip} fullWidth />
            <View className="flex-[2]">
              <Button
                label={busy ? 'Saving…' : 'Continue'}
                variant="gradient"
                size="lg"
                loading={busy}
                onPress={handleNext}
              />
            </View>
          </BottomActionBar>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
