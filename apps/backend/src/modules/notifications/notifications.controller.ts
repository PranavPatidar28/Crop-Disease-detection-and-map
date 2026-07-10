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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { User } from '@prisma/client';

import { CurrentUser } from '@/common/decorators/current-user.decorator';

import {
  ListNotificationsQueryDto,
  RegisterPushTokenDto,
  RevokePushTokenDto,
  UpdatePreferencesDto,
} from './dto';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationsService } from './notifications.service';
import { PushTokenService } from './push-token.service';

@Controller()
// 🛡️ Sentinel: Added ThrottlerGuard to mitigate DoS and abuse risks.
@UseGuards(ThrottlerGuard)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly preferences: NotificationPreferencesService,
    private readonly pushTokens: PushTokenService,
  ) {}

  @Get('notifications')
  list(@CurrentUser() user: User, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.list(user.id, query);
  }

  @Get('notifications/unread-count')
  async unreadCount(@CurrentUser() user: User) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: User) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Delete('notifications/:id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notifications.remove(user.id, id);
  }

  // Push tokens
  @Post('users/me/push-token')
  @HttpCode(HttpStatus.OK)
  async registerPushToken(@CurrentUser() user: User, @Body() dto: RegisterPushTokenDto) {
    await this.pushTokens.register(user.id, dto.token, dto.platform);
    return { ok: true };
  }

  @Delete('users/me/push-token')
  @HttpCode(HttpStatus.OK)
  async revokePushToken(@CurrentUser() user: User, @Body() dto: RevokePushTokenDto) {
    await this.pushTokens.revoke(user.id, dto.token);
    return { ok: true };
  }

  // Preferences
  @Get('users/me/preferences')
  getPreferences(@CurrentUser() user: User) {
    return this.preferences.getOrCreate(user.id);
  }

  @Patch('users/me/preferences')
  updatePreferences(@CurrentUser() user: User, @Body() dto: UpdatePreferencesDto) {
    return this.preferences.update(user.id, dto);
  }
}
