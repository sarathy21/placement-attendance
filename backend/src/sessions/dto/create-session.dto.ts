import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Java Collections Framework - Deep Dive', description: 'Session title/topic' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Subject/Training Module UUID' })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'Venue UUID' })
  @IsUUID()
  @IsNotEmpty()
  venueId: string;

  @ApiPropertyOptional({ description: 'Conducting Staff UUID (Required for ADMIN, auto-set to caller for STAFF)' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiProperty({ description: 'Target Department UUID (Required for MVP targeting)' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiPropertyOptional({ description: 'Target Course UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Target Batch UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @ApiProperty({ example: '2026-09-30', description: 'Session date (YYYY-MM-DD or ISO string)' })
  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @ApiProperty({ example: '2026-09-30T10:00:00+05:30', description: 'Session start timestamp' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2026-09-30T12:00:00+05:30', description: 'Session end timestamp' })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
