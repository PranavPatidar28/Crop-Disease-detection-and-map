import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { TextButton } from '@/components/ui/text-button';
import { OtpInput } from '@/features/auth/components/otp-input';
import { useSendOtp } from '@/features/auth/hooks/use-send-otp';
import { useVerifyOtp } from '@/features/auth/hooks/use-verify-otp';
import { useTranslation } from '@/i18n';
import { AnimatedView, Text, View } from '@/tw';
import { normalizeError } from '@/utils/errors';

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = params.phone ?? '';
  const { t } = useTranslation();
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
      setError(t('otp.errorLength'));
      return;
    }
    if (!phone) {
      setError(t('otp.errorMissingPhone'));
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
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="px-4 pt-3">
            <BackButton onPress={() => router.back()} />
          </View>

          <View className="flex-1 items-center justify-center gap-5 px-6">
            <AnimatedView entering={FadeInDown.duration(400)} className="items-center gap-1">
              <Text className="text-2xl font-extrabold tracking-tight text-text">
                {t('otp.title')}
              </Text>
              <Text className="text-sm text-text-muted">{t('otp.sentTo', { phone })}</Text>
            </AnimatedView>

            <OtpInput
              value={otp}
              onChangeText={setOtp}
              error={error}
              onComplete={handleSubmit}
            />

            <TextButton
              label={
                secondsLeft > 0
                  ? t('otp.resendIn', { seconds: secondsLeft })
                  : sendOtp.isPending
                    ? t('otp.sending')
                    : t('otp.resendCode')
              }
              onPress={handleResend}
              disabled={secondsLeft > 0 || sendOtp.isPending}
              className="self-center"
            />
          </View>

          <BottomActionBar divider={false}>
            <Button
              label={verifyOtp.isPending ? t('otp.verifying') : t('otp.verify')}
              variant="gradient"
              size="lg"
              loading={verifyOtp.isPending}
              disabled={otp.length !== 6}
              onPress={() => handleSubmit()}
            />
            <Text className="text-center text-xs text-text-faint">
              {t('otp.demoOtp')}
            </Text>
          </BottomActionBar>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
