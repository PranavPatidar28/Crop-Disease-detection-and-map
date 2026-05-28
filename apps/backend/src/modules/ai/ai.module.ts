import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { FastApiAiClient } from './clients/fastapi.client';
import { MockAiClient } from './clients/mock-ai.client';

@Module({
  providers: [AiService, MockAiClient, FastApiAiClient],
  exports: [AiService],
})
export class AiModule {}
