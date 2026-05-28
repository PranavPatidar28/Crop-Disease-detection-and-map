import { useMutation } from '@tanstack/react-query';

import { authApi, type SendOtpResponse } from '../api/auth.api';

export function useSendOtp() {
  return useMutation<SendOtpResponse, Error, { phone: string }>({
    mutationFn: ({ phone }) => authApi.sendOtp(phone),
  });
}
