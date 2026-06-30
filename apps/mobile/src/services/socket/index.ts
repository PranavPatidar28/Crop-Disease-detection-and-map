import { io, Socket } from 'socket.io-client';

import { env, STORAGE_KEYS } from '@/constants';
import { secureStorage } from '@/services/storage/secure';
import { logger } from '@/utils/logger';

let socket: Socket | null = null;
let currentToken: string | null = null;

/**
 * Returns a connected Socket.IO instance, creating one on first call. If the
 * stored auth token has changed since the last connection (e.g. logout +
 * login with a different account), the stale socket is torn down and a fresh
 * one is created with the new token.
 *
 * Safe to call repeatedly — short-circuits when an active socket already
 * matches the current token.
 */
export async function getSocket(): Promise<Socket> {
  const token = await secureStorage.get(STORAGE_KEYS.authToken);

  // Reuse the existing socket whenever the token is unchanged — even if it's
  // momentarily disconnected. socket.io auto-reconnects (reconnection: true),
  // so keying reuse on `connected` would tear down a socket mid-reconnect and
  // drop every feature listener attached by the realtime hooks.
  if (socket && token === currentToken) {
    return socket;
  }

  // Token changed (or first call) — tear down any stale socket before creating fresh.
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  socket = io(env.socketUrl, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
    auth: token ? { token } : undefined,
  });

  socket.on('connect', () => {
    logger.info('[socket] connected', socket?.id);
  });
  socket.on('disconnect', (reason) => {
    logger.info('[socket] disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    logger.warn('[socket] connect_error', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
