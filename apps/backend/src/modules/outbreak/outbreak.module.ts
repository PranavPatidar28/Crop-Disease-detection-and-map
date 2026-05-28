import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { OutbreakController } from './outbreak.controller';
import { OutbreakProcessor } from './outbreak.processor';
import { OutbreakScheduler } from './outbreak.scheduler';
import { OutbreakService } from './outbreak.service';

@Module({
  imports: [RealtimeModule, NotificationsModule],
  controllers: [OutbreakController],
  providers: [OutbreakService, OutbreakProcessor, OutbreakScheduler],
  exports: [OutbreakService, OutbreakProcessor],
})
export class OutbreakModule {}
