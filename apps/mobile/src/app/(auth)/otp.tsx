import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { OtpInput } from '@/features/auth/components/otp-input';
import { useSendOtp } from '@/features/auth/hooks/use-send-otp';
import { useVerifyOtp } from '@/features/auth/hooks/use-verify-otp';
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
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="px-4 pt-3">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              className="self-start"
            >
              <Text className="text-sm font-bold text-brand-700">‹ Back</Text>
            </Pressable>
          </View>

          <View className="flex-1 items-center justify-center gap-5 px-6">
            <Animated.View entering={FadeInDown.duration(400)} className="items-center gap-1">
              <Text className="text-2xl font-extrabold tracking-tight text-text">
                Enter 6-digit code
              </Text>
              <Text className="text-sm text-text-muted">Sent to +91 {phone}</Text>
            </Animated.View>

            <OtpInput
              value={otp}
              onChangeText={setOtp}
              error={error}
              onComplete={handleSubmit}
            />

            <Pressable accessibilityRole="button" onPress={handleResend} disabled={secondsLeft > 0 || sendOtp.isPending}>
              <Text
                className={
                  secondsLeft > 0
                    ? 'text-sm font-bold text-text-faint'
                    : 'text-sm font-bold text-brand-700'
                }
              >
                {secondsLeft > 0
                  ? `Resend in ${secondsLeft}s`
                  : sendOtp.isPending
                    ? 'Sending…'
                    : 'Resend code'}
              </Text>
            </Pressable>
          </View>

          <View className="gap-2 px-4 pb-6">
            <Button
              label={verifyOtp.isPending ? 'Verifying…' : 'Verify'}
              variant="gradient"
              size="lg"
              loading={verifyOtp.isPending}
              disabled={otp.length !== 6}
              onPress={() => handleSubmit()}
            />
            <Text className="text-center text-xs text-text-faint">
              Demo OTP: 123456
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
