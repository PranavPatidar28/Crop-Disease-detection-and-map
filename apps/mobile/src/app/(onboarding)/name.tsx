import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthCard } from '@/features/auth/components/auth-card';
import { authApi } from '@/features/auth/api/auth.api';
import { onboardingStorage } from '@/features/plots/onboarding-storage';
import { PressableScale } from '@/components/ui/pressable-scale';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth.store';
import { palette } from '@/theme/colors';
import { Text, TextInput, View } from '@/tw';

export default function OnboardingNameScreen() {
  const theme = useTheme();
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
      <LinearGradient
        colors={[palette.brand[700], palette.brand[900], '#0b1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 justify-end gap-6 px-5 pb-10">
            <Animated.View entering={FadeInUp.duration(450)}>
              <View className="gap-2 px-1">
                <Text className="text-xs font-medium uppercase tracking-wider text-white/60">
                  Step 1 of 2
                </Text>
                <Text className="text-4xl font-bold tracking-tight text-white">
                  What should we call you?
                </Text>
                <Text className="text-base text-white/70">
                  We use your name in greetings and to credit your reports.
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).duration(450)}>
              <AuthCard>
                <View className="gap-3">
                  <Text className="text-sm font-medium text-text-muted">Your name</Text>
                  <View
                    className={`h-14 flex-row items-center rounded-2xl border bg-surface px-3 ${
                      error ? 'border-danger' : 'border-border'
                    }`}
                  >
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="e.g. Ramesh Patil"
                      placeholderTextColor={theme.textSubtle}
                      autoCapitalize="words"
                      autoFocus
                      style={{ flex: 1, color: theme.text, fontSize: 17 }}
                    />
                  </View>
                  {error ? <Text className="text-xs text-danger">{error}</Text> : null}

                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="Continue"
                    onPress={handleNext}
                    disabled={busy}
                    haptic="light"
                    pressedScale={0.97}
                    style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      opacity: busy ? 0.6 : 1,
                      shadowColor: palette.brand[500],
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.32,
                      shadowRadius: 16,
                      elevation: 6,
                    }}
                  >
                    <LinearGradient
                      colors={[palette.brand[400], palette.brand[600], palette.brand[700]]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      locations={[0, 0.55, 1]}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }}
                      />
                      <View className="h-14 flex-row items-center justify-center gap-2 px-5">
                        {busy ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-base font-semibold text-white">Continue</Text>
                        )}
                      </View>
                    </LinearGradient>
                  </PressableScale>
                </View>
              </AuthCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(450)}>
              <Pressable accessibilityRole="button" onPress={handleSkip}>
                <Text className="text-center text-xs text-white/60">Skip for now</Text>
              </Pressable>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
