import { IsNotEmpty, IsString, IsEmail, IsOptional, IsUUID, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: '2026MCA001', description: 'Unique register number' })
  @IsString()
  @IsNotEmpty()
  registerNumber: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'john.doe@college.edu', description: 'Unique college email' })
  @IsEmail()
  @IsNotEmpty()
  collegeEmail: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Course UUID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiPropertyOptional({ description: 'Placement Batch UUID' })
  @IsOptional()
  @IsUUID()
  placementBatchId?: string;

  @ApiPropertyOptional({ example: true, description: 'Placement eligibility flag' })
  @IsOptional()
  @IsBoolean()
  isPlacementEligible?: boolean;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
