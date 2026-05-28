import { Injectable, Logger } from '@nestjs/common';
import type { Notification, OutbreakZone, Report } from '@prisma/client';

import { RealtimeGateway } from './realtime.gateway';

/**
 * Server-side emit helpers. Imported by ReportsProcessor / OutbreakProcessor /
 * NotificationsService to broadcast realtime events without coupling them to
 * Socket.IO directly.
 *
 * `map.updated` is rate-limited so a flurry of reports doesn't spam clients —
 * at most one tick every 5 seconds.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private mapUpdatedLastSentAt = 0;
  private readonly mapUpdatedThrottleMs = 5_000;

  constructor(private readonly gateway: RealtimeGateway) {}

  reportCreated(report: Report): void {
    this.gateway.server.emit('report.created', { report });
    this.tickMap();
  }

  outbreakCreated(zone: OutbreakZone): void {
    this.gateway.server.emit('outbreak.created', { zone });
    this.tickMap();
  }

  outbreakUpdated(zone: OutbreakZone): void {
    this.gateway.server.emit('outbreak.updated', { zone });
    this.tickMap();
  }

  outbreakResolved(zone: OutbreakZone): void {
    this.gateway.server.emit('outbreak.resolved', { zone });
    this.tickMap();
  }

  /** Targeted notification events (per-user room). */
  notificationCreated(userId: string, notification: Notification): void {
    this.gateway.server.to(`user:${userId}`).emit('notification.created', { notification });
  }

  notificationRead(userId: string, notificationId: string): void {
    this.gateway.server.to(`user:${userId}`).emit('notification.read', { id: notificationId });
  }

  notificationReadAll(userId: string): void {
    this.gateway.server.to(`user:${userId}`).emit('notification.read-all', {});
  }

  notificationDeleted(userId: string, notificationId: string): void {
    this.gateway.server.to(`user:${userId}`).emit('notification.deleted', { id: notificationId });
  }

  /** Lightweight "something changed" tick. Throttled. */
  private tickMap(): void {
    const now = Date.now();
    if (now - this.mapUpdatedLastSentAt < this.mapUpdatedThrottleMs) return;
    this.mapUpdatedLastSentAt = now;
    this.gateway.server.emit('map.updated', { at: new Date(now).toISOString() });
  }
}
