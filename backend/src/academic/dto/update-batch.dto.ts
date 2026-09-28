import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBatchDto {
  @ApiPropertyOptional({ example: '2023-2025', description: 'Batch name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 2023, description: 'Academic start year' })
  @IsOptional()
  @IsInt()
  @Min(2000)
  startYear?: number;

  @ApiPropertyOptional({ example: 2025, description: 'Academic end year' })
  @IsOptional()
  @IsInt()
  @Min(2000)
  endYear?: number;

  @ApiPropertyOptional({ description: 'Parent Course UUID' })
  @IsOptional()
  @IsUUID()
  courseId?: string;
}
