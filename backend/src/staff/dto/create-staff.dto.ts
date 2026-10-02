import { IsNotEmpty, IsOptional, IsString, IsEmail, MinLength, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStaffDto {
  @ApiProperty({ example: 'STAFF001', description: 'Unique Staff ID' })
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ example: 'staff001@kahedu.edu.in', description: 'Unique login email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Initial password (min 8 characters)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Placement Officer', description: 'Designation / Title' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Parent Department UUID' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
