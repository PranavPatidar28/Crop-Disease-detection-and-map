import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OutbreakModule } from './modules/outbreak/outbreak.module';
import { PlotsModule } from './modules/plots/plots.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:HH:MM:ss',
                  ignore: 'pid,hostname,req,res,responseTime',
                },
              }
            : undefined,
        autoLogging: process.env.NODE_ENV === 'production',
      },
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CloudinaryModule,
    ReportsModule,
    OutbreakModule,
    PlotsModule,
    NotificationsModule,
    RealtimeModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
