import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Notification } from '@prisma/client';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';

import type { Env } from '@/config/env.schema';
import { PrismaService } from '@/modules/prisma/prisma.service';

/**
 * Wraps the Expo push SDK. Sends batched messages, prunes invalid tokens.
 * Designed to fail soft: a push failure NEVER prevents the in-app notification
 * row from being persisted or the WS event from being emitted.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly expo: Expo;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    const accessToken = config.get('EXPO_ACCESS_TOKEN', { infer: true });
    this.expo = new Expo({ accessToken: accessToken || undefined });
  }

  /**
   * Sends multiple notifications to users' registered tokens efficiently.
   * Batches database queries and push payload dispatching.
   */
  async sendMultiple(notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) return;

    const userIds = Array.from(new Set(notifications.map((n) => n.userId)));

    // Batch DB query to avoid N+1. Guarded: a transient DB failure here must
    // fail soft (the in-app rows + WS events already landed), never propagate
    // out of this fire-and-forget path and crash the process.
    let userTokens: Array<{ userId: string; token: string }>;
    try {
      userTokens = await this.prisma.pushToken.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, token: true },
      });
    } catch (err) {
      this.logger.warn(`Push token lookup failed: ${(err as Error).message}`);
      return;
    }

    if (userTokens.length === 0) return;

    // Group valid tokens by userId for O(1) lookup
    const tokensByUserId = new Map<string, string[]>();
    for (const t of userTokens) {
      if (Expo.isExpoPushToken(t.token)) {
        const existing = tokensByUserId.get(t.userId) || [];
        existing.push(t.token);
        tokensByUserId.set(t.userId, existing);
      }
    }

    const messages: ExpoPushMessage[] = [];

    for (const notification of notifications) {
      const tokens = tokensByUserId.get(notification.userId) || [];
      for (const token of tokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: notification.id,
            ...((notification.data as Record<string, unknown> | null) ?? {}),
          },
          priority: notification.severity === 'HIGH' ? 'high' : 'default',
        });
      }
    }

    if (messages.length === 0) return;

    // Chunking happens across all notifications instead of per-user
    // This allows Expo SDK to effectively batch network requests
    const chunks = this.expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        await this.handleTickets(chunk, tickets);
      } catch (err) {
        this.logger.warn(`Expo push send failed: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Sends one notification to all of a user's registered tokens.
   */
  async sendToUser(userId: string, notification: Notification): Promise<void> {
    await this.sendMultiple([notification]);
  }

  private async handleTickets(
    messages: ExpoPushMessage[],
    tickets: ExpoPushTicket[],
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i += 1) {
      const ticket = tickets[i];
      const msg = messages[i];
      if (!ticket || !msg) continue;
      if (ticket.status === 'error') {
        const tokenStr = Array.isArray(msg.to) ? msg.to[0] : msg.to;
        if (!tokenStr) continue;
        const code = ticket.details?.error;
        // Drop tokens Expo says are invalid.
        if (code === 'DeviceNotRegistered' || code === 'InvalidCredentials') {
          await this.prisma.pushToken.deleteMany({ where: { token: tokenStr } });
          this.logger.log(`Pruned invalid push token (${code})`);
        } else {
          this.logger.warn(`Push ticket error: ${code ?? ticket.message}`);
        }
      }
    }
  }
}
