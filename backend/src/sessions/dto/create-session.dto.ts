import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Java Collections Framework - Deep Dive', description: 'Session title/topic' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Aptitude & Technical Preparation', description: 'Session description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Subject/Training Module UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @ApiProperty({ description: 'Venue UUID' })
  @IsUUID()
  @IsNotEmpty()
  venueId: string;

  @ApiPropertyOptional({ description: 'Conducting Staff UUID (Required for ADMIN, auto-set to caller for STAFF)' })
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({ description: 'Target Department UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Target Course UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Target Placement Batch UUID (Optional)' })
  @IsOptional()
  @IsUUID()
  placementBatchId?: string;

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
