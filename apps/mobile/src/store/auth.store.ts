import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants';
import { asyncStorage } from '@/services/storage/async';
import { secureStorage } from '@/services/storage/secure';
import { disconnectSocket } from '@/services/socket';
import type { User } from '@/types/user';

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;

  setSession: (user: User, token: string) => Promise<void>;
  setUser: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

/**
 * Auth store. Token lives in SecureStore (sensitive), user lives in AsyncStorage
 * (cheap to read on boot for instant UI).
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,
  isAuthenticated: false,

  async setSession(user, token) {
    await Promise.all([
      secureStorage.set(STORAGE_KEYS.authToken, token),
      asyncStorage.setJSON(STORAGE_KEYS.authUser, user),
    ]);
    set({ user, token, isAuthenticated: true });
  },

  async setUser(user) {
    await asyncStorage.setJSON(STORAGE_KEYS.authUser, user);
    set({ user });
  },

  async logout() {
    await Promise.all([
      secureStorage.remove(STORAGE_KEYS.authToken),
      asyncStorage.remove(STORAGE_KEYS.authUser),
    ]);
    disconnectSocket();
    set({ user: null, token: null, isAuthenticated: false });
  },

  async hydrate() {
    if (get().isHydrated) return;
    const [token, user] = await Promise.all([
      secureStorage.get(STORAGE_KEYS.authToken),
      asyncStorage.getJSON<User>(STORAGE_KEYS.authUser),
    ]);
    set({
      token,
      user,
      isAuthenticated: !!token && !!user,
      isHydrated: true,
    });
  },
}));
