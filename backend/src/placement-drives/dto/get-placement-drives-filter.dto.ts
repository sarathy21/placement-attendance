import { IsEnum, IsOptional, IsString, IsISO8601, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DriveStatus } from '@prisma/client';

export class GetPlacementDrivesFilterDto {
  @ApiPropertyOptional({ enum: DriveStatus, description: 'Filter by drive status' })
  @IsOptional()
  @IsEnum(DriveStatus)
  status?: DriveStatus;

  @ApiPropertyOptional({ example: 'TCS', description: 'Filter by company name search substring' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ example: '2026-10-01', description: 'Start date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31', description: 'End date filter (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  toDate?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by attendanceEnabled boolean flag' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  attendanceEnabled?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
