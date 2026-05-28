import Constants from 'expo-constants';

/**
 * Validated, typed access to Expo public env vars.
 *
 * EXPO_PUBLIC_* values are inlined at build time. Expo's lint plugin requires
 * them to be referenced statically (no `process.env[name]` indirection).
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

export const env = {
  apiUrl: API_URL,
  socketUrl: SOCKET_URL,
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  isDev: __DEV__,
} as const;
