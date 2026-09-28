import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'JAVA-FS', description: 'Unique subject/training code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Java Full Stack Training', description: 'Subject title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Comprehensive core and advanced Java spring boot training', description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}
