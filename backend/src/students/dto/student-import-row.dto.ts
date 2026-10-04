import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentImportRowDto {
  @ApiProperty({ example: '25cap109' })
  @IsString()
  @IsNotEmpty()
  registerNumber: string;

  @ApiProperty({ example: '25cap109@kahedu.edu.in' })
  @IsEmail()
  @IsNotEmpty()
  collegeEmail: string;

  @ApiProperty({ example: 'Sarathy' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'S', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'MCA', required: false })
  @IsOptional()
  @IsString()
  departmentCode?: string;

  @ApiProperty({ example: 'MCA-FT', required: false })
  @IsOptional()
  @IsString()
  courseCode?: string;

  @ApiProperty({ example: 'TCS-Prime-2026', required: false })
  @IsOptional()
  @IsString()
  placementBatchName?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
