import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { createWsJwtMiddleware } from './ws-jwt.middleware';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '',
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService) {}

  afterInit(server: Server): void {
    createWsJwtMiddleware(this.jwt)(server);
    this.logger.log(`Realtime gateway initialized (transports: ${server.engine.opts.transports})`);
  }

  handleConnection(client: Socket): void {
    const user = client.data.user as { sub?: string; phone?: string } | undefined;
    if (user?.sub) {
      void client.join(`user:${user.sub}`);
    }
    this.logger.log(
      `Client connected: ${client.id}${user ? ` (user=${user.sub ?? 'unknown'})` : ''}`,
    );
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
