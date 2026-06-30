import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type Notification, type NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { RealtimeService } from '@/modules/realtime/realtime.service';

import { PushService } from './push.service';
import type { NotificationTemplate } from './templates';

interface ListOptions {
  limit: number;
  cursor?: string;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface PaginatedNotifications {
  items: Notification[];
  nextCursor: string | null;
  unreadCount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly push: PushService,
  ) {}

  async list(userId: string, options: ListOptions): Promise<PaginatedNotifications> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(options.unreadOnly ? { read: false } : {}),
      ...(options.type ? { type: options.type } : {}),
    };

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > options.limit) {
      const overflow = items.pop();
      if (overflow) nextCursor = overflow.id;
    }

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { items, nextCursor, unreadCount };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      // 404 (not 500) and doesn't leak whether the row exists for another user.
      throw new NotFoundException('Notification not found');
    }
    if (notification.read) return notification;

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
    this.realtime.notificationRead(userId, id);
    return updated;
  }

  async markAllRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    this.realtime.notificationReadAll(userId);
    return { count: result.count };
  }

  async remove(userId: string, id: string): Promise<{ ok: true }> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.delete({ where: { id } });
    this.realtime.notificationDeleted(userId, id);
    return { ok: true };
  }

  /**
   * Persists notifications for a set of users in a single batch, then emits
   * realtime + push events per recipient.
   */
  async createForUsers(userIds: string[], template: NotificationTemplate): Promise<Notification[]> {
    if (userIds.length === 0) return [];

    const dataPayload = template.data as Prisma.InputJsonValue;
    // createManyAndReturn gives us exactly the rows we just inserted (with IDs +
    // timestamps). The previous title/body re-read was unsound: templates with
    // constant copy (e.g. "Outbreak escalated") collide with historical rows, so
    // `take: userIds.length` could duplicate one recipient and drop another.
    const created = await this.prisma.notification.createManyAndReturn({
      data: userIds.map((userId) => ({
        userId,
        type: template.type,
        title: template.title,
        body: template.body,
        severity: template.severity,
        data: dataPayload,
      })),
    });

    for (const notification of created) {
      this.realtime.notificationCreated(notification.userId, notification);
    }

    // Batch Expo push notifications to avoid N+1 queries and API calls
    void this.push.sendMultiple(created);

    this.logger.log(
      `Notifications dispatched: type=${template.type} severity=${template.severity ?? '-'} recipients=${created.length}`,
    );

    return created;
  }
}
