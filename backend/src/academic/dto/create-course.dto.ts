import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'MCA-FT', description: 'Unique course code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Master of Computer Applications (Full Time)', description: 'Course full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Parent Department UUID' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;
}
