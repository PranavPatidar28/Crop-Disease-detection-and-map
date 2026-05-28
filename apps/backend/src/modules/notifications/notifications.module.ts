import { Module } from '@nestjs/common';

import { RealtimeModule } from '../realtime/realtime.module';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsFanoutService } from './notifications.fanout.service';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { PushTokenService } from './push-token.service';

@Module({
  imports: [RealtimeModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsFanoutService,
    NotificationPreferencesService,
    PushService,
    PushTokenService,
  ],
  exports: [NotificationsService, NotificationsFanoutService],
})
export class NotificationsModule {}
