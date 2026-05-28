import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';

import type { Env } from '@/config/env.schema';
import { PrismaService } from '@/modules/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: User['role'];
}

export interface AuthSession {
  token: string;
  user: User;
}

const DEMO_PHONES = ['9999999999', '8888888888'] as const;
const DEMO_OTP = '123456';
const OTP_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Mock OTP send. In production this would call Twilio / MSG91.
   * Only the demo phones are accepted in this build.
   */
  async sendOtp(phone: string): Promise<{ ok: true; expiresIn: number; demo: boolean }> {
    if (!(DEMO_PHONES as readonly string[]).includes(phone)) {
      throw new BadRequestException(
        `Only demo phone numbers are supported in this build (use ${DEMO_PHONES.join(' or ')})`,
      );
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1_000);

    await this.prisma.otpToken.create({
      data: {
        phone,
        code: DEMO_OTP,
        expiresAt,
      },
    });

    this.logger.log(`Mock OTP issued for ${phone} (expires in ${OTP_TTL_SECONDS}s)`);

    return { ok: true, expiresIn: OTP_TTL_SECONDS, demo: true };
  }

  /**
   * Validates the OTP against the latest unconsumed token, upserts the user,
   * marks the token consumed, and returns a signed JWT + user.
   */
  async verifyOtp(phone: string, otp: string): Promise<AuthSession> {
    const token = await this.prisma.otpToken.findFirst({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) {
      throw new UnauthorizedException('OTP expired or not found. Please request a new one.');
    }

    if (token.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new UnauthorizedException('Too many attempts. Please request a new OTP.');
    }

    if (token.code !== otp) {
      await this.prisma.otpToken.update({
        where: { id: token.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    const user = await this.prisma.user.upsert({
      where: { phone },
      create: { phone },
      update: {},
    });

    await this.prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date(), userId: user.id },
    });

    const payload: JwtPayload = { sub: user.id, phone: user.phone, role: user.role };
    const jwt = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    });

    return { token: jwt, user };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
