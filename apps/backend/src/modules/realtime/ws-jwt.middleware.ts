import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';

import type { JwtPayload } from '@/modules/auth/auth.service';

const logger = new Logger('WsJwtMiddleware');

/**
 * Validates the JWT carried in the Socket.IO handshake's `auth.token` field.
 * Mobile sends this via `getSocket()` already (see services/socket/index.ts).
 *
 * Attaches the decoded payload to `socket.data.user`. Handshakes that fail
 * verification are rejected and Socket.IO's reconnect logic kicks in.
 */
export const createWsJwtMiddleware =
  (jwt: JwtService) =>
  (server: Server): void => {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        extractFromHeader(socket.handshake.headers.authorization);

      if (!token) {
        logger.warn(`WS handshake missing token (${socket.id})`);
        return next(new Error('UNAUTHORIZED'));
      }

      try {
        const payload = await jwt.verifyAsync<JwtPayload>(token);
        socket.data.user = payload;
        return next();
      } catch (err) {
        logger.warn(`WS handshake invalid token (${socket.id}): ${(err as Error).message}`);
        return next(new Error('UNAUTHORIZED'));
      }
    });
  };

function extractFromHeader(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const header = Array.isArray(value) ? value[0] : value;
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return undefined;
  return token;
}
