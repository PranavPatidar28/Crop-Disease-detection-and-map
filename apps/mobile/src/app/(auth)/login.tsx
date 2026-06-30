import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/features/auth/components/phone-input';
import { useSendOtp } from '@/features/auth/hooks/use-send-otp';
import { useTranslation } from '@/i18n';
import { palette } from '@/theme/colors';
import { AnimatedView, Text, View } from '@/tw';
import { normalizeError } from '@/utils/errors';

const DEMO_PHONE = '9999999999';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | undefined>();
  const sendOtp = useSendOtp();

  const handleSubmit = async () => {
    setError(undefined);
    if (phone.length !== 10) {
      setError(t('login.errorInvalidPhone'));
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
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 items-center justify-center gap-3 px-6 pt-6">
            <AnimatedView entering={FadeIn.duration(400)}>
              <View
                className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-border"
                style={{
                  shadowColor: palette.brand[600],
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.32,
                  shadowRadius: 18,
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={[palette.brand[400], palette.brand[600]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text className="text-2xl">🌾</Text>
              </View>
            </AnimatedView>
            <AnimatedView entering={FadeInDown.delay(80).duration(400)} className="items-center gap-1">
              <Text className="text-3xl font-extrabold tracking-tight text-text">
                {t('login.welcome')}
              </Text>
              <Text className="max-w-[260px] text-center text-sm text-text-muted">
                {t('login.tagline')}
              </Text>
            </AnimatedView>
          </View>

          <AnimatedView entering={FadeInDown.delay(160).duration(400)} className="gap-3 px-4 pb-6">
            <Text className="text-xs font-bold uppercase tracking-[1.4px] text-text-subtle">
              {t('login.phoneNumber')}
            </Text>
            <PhoneInput value={phone} onChangeText={setPhone} error={error} />
            <Button
              label={sendOtp.isPending ? t('login.sendingOtp') : t('login.sendOtp')}
              variant="gradient"
              size="lg"
              loading={sendOtp.isPending}
              onPress={handleSubmit}
            />
            <Text className="text-center text-xs text-text-faint">
              {t('login.demoNote', { phone: DEMO_PHONE })}
            </Text>
          </AnimatedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
