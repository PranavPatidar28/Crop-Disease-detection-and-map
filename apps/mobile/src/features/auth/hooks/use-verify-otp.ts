import { useMutation } from '@tanstack/react-query';

import { useAuthStore } from '@/store/auth.store';

import { authApi, type VerifyOtpResponse } from '../api/auth.api';

export function useVerifyOtp() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation<VerifyOtpResponse, Error, { phone: string; otp: string }>({
    mutationFn: ({ phone, otp }) => authApi.verifyOtp(phone, otp),
    onSuccess: async (data) => {
      await setSession(data.user, data.token);
    },
  });
}
