import { Module } from '@nestjs/common';

import { AiModule } from '@/modules/ai/ai.module';

import { DiseasesController } from './diseases.controller';
import { DiseasesService } from './diseases.service';

@Module({
  imports: [AiModule],
  controllers: [DiseasesController],
  providers: [DiseasesService],
})
export class DiseasesModule {}
