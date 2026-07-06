import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { CreateReportDto, ListReportsQueryDto, NearbyReportsQueryDto } from './dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(ThrottlerGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreateReportDto) {
    return this.reports.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: User, @Query() query: ListReportsQueryDto) {
    return this.reports.list(user.id, query);
  }

  @Get('nearby')
  nearby(@Query() query: NearbyReportsQueryDto) {
    return this.reports.findNearby(query);
  }

  // Must precede `@Get(':id')` so the literal `count` segment isn't captured as an id.
  @Get('count')
  count(@CurrentUser() user: User) {
    return this.reports.countForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reports.findById(user.id, id);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  reprocess(@CurrentUser() user: User, @Param('id') id: string) {
    return this.reports.reprocess(user.id, id);
  }
}
