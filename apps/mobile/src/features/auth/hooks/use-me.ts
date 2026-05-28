import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/user';

import { authApi } from '../api/auth.api';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const user = await authApi.me();
      void setUser(user);
      return user;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
