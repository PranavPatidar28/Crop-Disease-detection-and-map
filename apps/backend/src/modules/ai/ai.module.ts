import { Module } from '@nestjs/common';

import { AiService } from './ai.service';
import { FastApiAiClient } from './clients/fastapi.client';
import { HfCropDiseaseClient } from './clients/hf.client';
import { MockAiClient } from './clients/mock-ai.client';

@Module({
  providers: [AiService, MockAiClient, FastApiAiClient, HfCropDiseaseClient],
  exports: [AiService, HfCropDiseaseClient],
})
export class AiModule {}
