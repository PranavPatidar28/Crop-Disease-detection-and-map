import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{10}$/u, { message: 'Phone must be a 10-digit number' })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/u, { message: 'OTP must be a 6-digit number' })
  otp!: string;
}
