import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  /** 10-digit Indian phone number (without country code). */
  @IsString()
  @Matches(/^\d{10}$/u, { message: 'Phone must be a 10-digit number' })
  phone!: string;
}
