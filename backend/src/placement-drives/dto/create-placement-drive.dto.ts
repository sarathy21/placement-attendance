import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsISO8601,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDriveRoundDto } from './create-drive-round.dto';

export class CreatePlacementDriveDto {
  @ApiProperty({ example: 'Tata Consultancy Services', description: 'Name of recruiting company' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ example: '2026-10-15', description: 'Scheduled date of the drive (YYYY-MM-DD)' })
  @IsISO8601()
  driveDate: string;

  @ApiProperty({ example: 'Main Auditorium', description: 'Primary venue for the placement drive' })
  @IsString()
  @IsNotEmpty()
  venue: string;

  @ApiPropertyOptional({ example: 'Campus placement drive for 2026 graduating batch.', description: 'Overview and guidelines' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether student attendance is tracked for this drive (OFF by default)' })
  @IsOptional()
  @IsBoolean()
  attendanceEnabled?: boolean;

  @ApiPropertyOptional({ type: [CreateDriveRoundDto], description: 'Optional initial list of recruitment rounds' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDriveRoundDto)
  rounds?: CreateDriveRoundDto[];
}
