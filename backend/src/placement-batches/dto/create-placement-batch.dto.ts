import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreatePlacementBatchDto {
  @ApiProperty({ example: 'TCS-Prime-2026', description: 'Globally unique placement batch name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  startYear?: number;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @IsInt()
  endYear?: number;

  @ApiPropertyOptional({ example: 'TCS Prime eligible students' })
  @IsOptional()
  @IsString()
  description?: string;
}
