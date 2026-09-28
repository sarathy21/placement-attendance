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

  @ApiProperty({ example: 'MCA' })
  @IsString()
  @IsNotEmpty()
  departmentCode: string;

  @ApiProperty({ example: 'MCA-FT' })
  @IsString()
  @IsNotEmpty()
  courseCode: string;

  @ApiProperty({ example: '2023-2025' })
  @IsString()
  @IsNotEmpty()
  batchName: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
