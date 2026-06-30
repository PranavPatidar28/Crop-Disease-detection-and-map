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
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/store/auth.store';
import { AnimatedView, Text, View } from '@/tw';

export default function OnboardingNameScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return setError(t('onboardingName.errorEmpty'));
    setBusy(true);
    try {
      const updated = await authApi.updateMe({ name: trimmed });
      await setUser(updated);
      router.push('/first-plot');
    } catch (err) {
      setError((err as Error).message ?? t('onboardingName.errorSave'));
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
            <SectionLabel>{t('onboardingName.step')}</SectionLabel>
          </View>

          <View className="flex-1 justify-center gap-3 px-4">
            <AnimatedView entering={FadeInDown.duration(400)} className="gap-2">
              <Text className="text-3xl font-extrabold tracking-tight text-text">
                {t('onboardingName.title')}
              </Text>
              <Text className="text-sm text-text-muted">
                {t('onboardingName.subtitle')}
              </Text>
            </AnimatedView>

            <AnimatedView entering={FadeInDown.delay(100).duration(400)}>
              <Input
                value={name}
                onChangeText={setName}
                placeholder={t('onboardingName.placeholder')}
                autoCapitalize="words"
                error={error ?? undefined}
              />
            </AnimatedView>
          </View>

          <BottomActionBar divider={false} row gapClassName="gap-3">
            <Button label={t('common.skip')} variant="ghost" size="lg" onPress={handleSkip} fullWidth />
            <View className="flex-[2]">
              <Button
                label={busy ? t('onboardingName.saving') : t('common.continue')}
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
