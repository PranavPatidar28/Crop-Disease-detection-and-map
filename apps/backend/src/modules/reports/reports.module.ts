import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OutbreakModule } from '../outbreak/outbreak.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';
import { ReportsService } from './reports.service';

@Module({
  imports: [CloudinaryModule, AiModule, RealtimeModule, OutbreakModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
