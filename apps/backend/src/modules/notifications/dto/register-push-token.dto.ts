import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

export class RevokePushTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  token!: string;
}
