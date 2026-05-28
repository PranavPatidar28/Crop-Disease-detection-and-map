import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  outbreakAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  reportAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  severityEscalations?: boolean;

  @IsOptional()
  @IsBoolean()
  resolvedAlerts?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number;
}
