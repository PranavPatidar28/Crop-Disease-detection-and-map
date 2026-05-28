import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ReportScope {
  Mine = 'mine',
  All = 'all',
}

export class ListReportsQueryDto {
  @IsOptional()
  @IsEnum(ReportScope)
  scope: ReportScope = ReportScope.Mine;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;
}
