import { Injectable, Logger } from '@nestjs/common';
import { type DevicePlatform } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class PushTokenService {
  private readonly logger = new Logger(PushTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent register-or-refresh. Reassigns the token if it was previously
   *  bound to a different user. */
  async register(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    const existing = await this.prisma.pushToken.findUnique({ where: { token } });
    if (existing) {
      await this.prisma.pushToken.update({
        where: { token },
        data: { userId, platform, lastSeenAt: new Date() },
      });
    } else {
      await this.prisma.pushToken.create({
        data: { userId, token, platform },
      });
    }
    this.logger.log(`Push token registered for user=${userId} platform=${platform}`);
  }

  async revoke(userId: string, token: string): Promise<void> {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }
}
