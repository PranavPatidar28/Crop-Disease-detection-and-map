import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { DiseasesService } from './diseases.service';
import type { AnalyzeResponse } from './diseases.types';
import { AnalyzeDiseaseDto } from './dto/analyze.dto';

@Controller('diseases')
// 🛡️ Sentinel: Added ThrottlerGuard to mitigate DoS and abuse risks.
@UseGuards(ThrottlerGuard)
export class DiseasesController {
  constructor(private readonly diseases: DiseasesService) {}

  /**
   * Synchronous diagnosis for the capture→review flow. Runs HF and returns the
   * advisory (or a retake signal). Creates NO report — the client confirms
   * separately via POST /reports. Authed by the global JwtAuthGuard.
   */
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  analyze(@Body() dto: AnalyzeDiseaseDto): Promise<AnalyzeResponse> {
    return this.diseases.analyze(dto.imageUrl);
  }
}
