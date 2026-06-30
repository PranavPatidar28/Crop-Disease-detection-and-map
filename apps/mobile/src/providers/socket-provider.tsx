import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/store/auth.store';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setConnected] = useState(false);

  // Re-run whenever the auth token changes (login / logout / account switch).
  // getSocket() reads the current token and rebuilds the socket if it differs,
  // so a user who logs in during the session gets an authenticated socket
  // instead of being stuck with the tokenless one created at app boot.
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    let mounted = true;
    let s: Socket | null = null;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    // No token (logged out / pre-hydration): there are no per-user events to
    // receive, so don't hold a socket. logout() already calls disconnectSocket().
    if (!token) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    (async () => {
      s = await getSocket();
      if (!mounted) {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        return;
      }

      setSocket(s);
      setConnected(s.connected);
      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
    })();

    return () => {
      mounted = false;
      if (s) {
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
      }
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
