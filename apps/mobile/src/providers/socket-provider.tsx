import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';

import { disconnectSocket, getSocket } from '@/services/socket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    let s: Socket | null = null;

    (async () => {
      s = await getSocket();
      if (!mounted) return;

      setSocket(s);
      setConnected(s.connected);
      s.on('connect', () => setConnected(true));
      s.on('disconnect', () => setConnected(false));
    })();

    return () => {
      mounted = false;
      if (s) {
        s.off('connect');
        s.off('disconnect');
      }
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
