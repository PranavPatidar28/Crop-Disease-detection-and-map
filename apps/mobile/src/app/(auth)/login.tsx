import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthCard } from '@/features/auth/components/auth-card';
import { GradientButton } from '@/features/auth/components/gradient-button';
import { PhoneInput } from '@/features/auth/components/phone-input';
import { useSendOtp } from '@/features/auth/hooks/use-send-otp';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { normalizeError } from '@/utils/errors';

const DEMO_PHONE = '9999999999';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const sendOtp = useSendOtp();

  const handleSubmit = async () => {
    setError(undefined);
    if (phone.length !== 10) {
      setError('Enter a 10-digit phone number');
      return;
    }
    try {
      await sendOtp.mutateAsync({ phone });
      router.push({ pathname: '/otp', params: { phone } });
    } catch (err) {
      setError(normalizeError(err).message);
    }
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
                <Text className="text-4xl font-bold tracking-tight text-white">
                  Welcome back
                </Text>
                <Text className="text-base text-white/70">
                  Sign in with your phone number to continue.
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).duration(450)}>
              <AuthCard>
                <View className="gap-5">
                  <View className="gap-1">
                    <Text className="text-sm font-medium text-text-muted">Phone number</Text>
                    <PhoneInput value={phone} onChangeText={setPhone} error={error} />
                  </View>

                  <GradientButton
                    label={sendOtp.isPending ? 'Sending OTP…' : 'Continue'}
                    loading={sendOtp.isPending}
                    onPress={handleSubmit}
                  />

                  <View className="rounded-xl bg-brand-500/10 px-3 py-2.5">
                    <Text className="text-xs text-text-muted">
                      Demo: use{' '}
                      <Text className="font-semibold text-text">+91 {DEMO_PHONE}</Text> to sign
                      in.
                    </Text>
                  </View>
                </View>
              </AuthCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).duration(450)}>
              <Text className="text-center text-xs text-white/50">
                By continuing, you agree to receive SMS for verification.
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
