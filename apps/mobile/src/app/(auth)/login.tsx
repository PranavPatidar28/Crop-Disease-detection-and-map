import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
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
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="flex-1 items-center justify-center gap-3 px-6 pt-6">
            <Animated.View entering={FadeIn.duration(400)}>
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
                  style={{ position: 'absolute', inset: 0 }}
                />
                <Text className="text-2xl">🌾</Text>
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(80).duration(400)} className="items-center gap-1">
              <Text className="text-3xl font-extrabold tracking-tight text-text">
                Welcome to AgroRadar
              </Text>
              <Text className="max-w-[260px] text-center text-sm text-text-muted">
                Detect, report, and track crop diseases together.
              </Text>
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)} className="gap-3 px-4 pb-6">
            <Text className="text-xs font-bold uppercase tracking-[1.4px] text-text-subtle">
              Phone number
            </Text>
            <PhoneInput value={phone} onChangeText={setPhone} error={error} />
            <Button
              label={sendOtp.isPending ? 'Sending OTP…' : 'Send OTP'}
              variant="gradient"
              size="lg"
              loading={sendOtp.isPending}
              onPress={handleSubmit}
            />
            <Text className="text-center text-xs text-text-faint">
              Demo: use +91 {DEMO_PHONE}. By continuing you agree to our Terms & Privacy.
            </Text>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
