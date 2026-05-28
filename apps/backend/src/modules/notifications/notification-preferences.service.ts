import { Injectable } from '@nestjs/common';
import type { NotificationPreferences } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';

import type { UpdatePreferencesDto } from './dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns existing preferences or upserts the default row. */
  async getOrCreate(userId: string): Promise<NotificationPreferences> {
    return this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async update(userId: string, dto: UpdatePreferencesDto): Promise<NotificationPreferences> {
    return this.prisma.notificationPreferences.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }
}
