import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { CreatePlotDto, UpdatePlotDto } from './dto';
import { PlotsService } from './plots.service';

@Controller('plots')
@UseGuards(ThrottlerGuard)
export class PlotsController {
  constructor(private readonly plots: PlotsService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.plots.list(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.plots.findById(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: User, @Body() dto: CreatePlotDto) {
    return this.plots.create(user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() dto: UpdatePlotDto) {
    return this.plots.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.plots.remove(user.id, id);
  }
}
