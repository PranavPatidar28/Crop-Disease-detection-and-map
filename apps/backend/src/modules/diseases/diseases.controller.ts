import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { DiseasesService } from './diseases.service';
import type { AnalyzeResponse } from './diseases.types';
import { AnalyzeDiseaseDto } from './dto/analyze.dto';

@Controller('diseases')
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
