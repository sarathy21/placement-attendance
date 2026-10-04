import { IsOptional, IsString, IsEnum, IsUUID, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

export class GetSessionsFilterDto {
  @ApiPropertyOptional({ description: 'Filter by Subject UUID' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Filter by Venue UUID' })
  @IsOptional()
  @IsUUID()
  venueId?: string;

  @ApiPropertyOptional({ description: 'Filter by Staff UUID' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Filter by Department UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by Course UUID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Filter by Placement Batch UUID' })
  @IsOptional()
  @IsUUID()
  placementBatchId?: string;

  @ApiPropertyOptional({ enum: SessionStatus, description: 'Filter by Session status' })
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Filter sessions from date (ISO string)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter sessions to date (ISO string)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
