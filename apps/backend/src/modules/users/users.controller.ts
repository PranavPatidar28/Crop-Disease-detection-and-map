import { Body, Controller, Get, Patch } from '@nestjs/common';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import { UpdateMeDto } from './dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }
}
