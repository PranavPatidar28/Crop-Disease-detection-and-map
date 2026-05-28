import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthCard } from '@/features/auth/components/auth-card';
import { GradientButton } from '@/features/auth/components/gradient-button';
import { OtpInput } from '@/features/auth/components/otp-input';
import { useSendOtp } from '@/features/auth/hooks/use-send-otp';
import { useVerifyOtp } from '@/features/auth/hooks/use-verify-otp';
import { palette } from '@/theme/colors';
import { Text, View } from '@/tw';
import { normalizeError } from '@/utils/errors';

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = params.phone ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleSubmit = async (code = otp) => {
    setError(undefined);
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    if (!phone) {
      setError('Missing phone number. Please go back and try again.');
      return;
    }
    try {
      await verifyOtp.mutateAsync({ phone, otp: code });
      // Auth store flips isAuthenticated; (auth)/_layout redirects to "/".
    } catch (err) {
      setError(normalizeError(err).message);
      setOtp('');
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || !phone) return;
    setError(undefined);
    try {
      await sendOtp.mutateAsync({ phone });
      setSecondsLeft(RESEND_SECONDS);
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
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                >
                  <Text className="text-sm text-white/70">‹ Back</Text>
                </Pressable>
                <Text className="text-4xl font-bold tracking-tight text-white">
                  Enter the code
                </Text>
                <Text className="text-base text-white/70">
                  We sent a 6-digit code to +91 {phone}.
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).duration(450)}>
              <AuthCard>
                <View className="gap-5">
                  <OtpInput
                    value={otp}
                    onChangeText={setOtp}
                    error={error}
                    onComplete={handleSubmit}
                  />

                  <GradientButton
                    label={verifyOtp.isPending ? 'Verifying…' : 'Verify'}
                    loading={verifyOtp.isPending}
                    onPress={() => handleSubmit()}
                  />

                  <View className="flex-row items-center justify-center gap-1">
                    <Text className="text-sm text-text-muted">Didn&apos;t get it?</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={handleResend}
                      disabled={secondsLeft > 0 || sendOtp.isPending}
                    >
                      <Text
                        className={
                          secondsLeft > 0
                            ? 'text-sm font-semibold text-text-subtle'
                            : 'text-sm font-semibold text-brand-500'
                        }
                      >
                        {secondsLeft > 0
                          ? `Resend in ${secondsLeft}s`
                          : sendOtp.isPending
                          ? 'Sending…'
                          : 'Resend OTP'}
                      </Text>
                    </Pressable>
                  </View>

                  <View className="rounded-xl bg-brand-500/10 px-3 py-2.5">
                    <Text className="text-xs text-text-muted">
                      Demo OTP: <Text className="font-semibold text-text">123456</Text>
                    </Text>
                  </View>
                </View>
              </AuthCard>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
