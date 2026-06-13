import { Injectable, Logger } from '@nestjs/common';
import { type DevicePlatform } from '@prisma/client';

import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class PushTokenService {
  private readonly logger = new Logger(PushTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Idempotent register-or-refresh. Reassigns the token if it was previously
   *  bound to a different user. Atomic upsert avoids the findUnique→create race
   *  (two concurrent registrations of the same new token both seeing null). */
  async register(userId: string, token: string, platform: DevicePlatform): Promise<void> {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, lastSeenAt: new Date() },
    });
    this.logger.log(`Push token registered for user=${userId} platform=${platform}`);
  }

  async revoke(userId: string, token: string): Promise<void> {
    // Guard against a falsy token: Prisma treats `token: undefined` in a where
    // clause as "not provided", so deleteMany({ userId, token: undefined })
    // would wipe ALL of this user's tokens. Require a concrete token.
    if (!token) return;
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }
}
