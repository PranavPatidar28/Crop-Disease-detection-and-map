import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ListOutbreaksQueryDto } from './dto';
import { OutbreakService } from './outbreak.service';

@Controller('outbreaks')
@UseGuards(ThrottlerGuard)
export class OutbreakController {
  constructor(private readonly outbreaks: OutbreakService) {}

  @Get()
  list(@Query() query: ListOutbreaksQueryDto) {
    return this.outbreaks.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.outbreaks.findById(id);
  }
}
