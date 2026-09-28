import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBatchDto {
  @ApiProperty({ example: '2023-2025', description: 'Batch name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 2023, description: 'Academic start year' })
  @IsInt()
  @Min(2000)
  startYear: number;

  @ApiProperty({ example: 2025, description: 'Academic end year' })
  @IsInt()
  @Min(2000)
  endYear: number;

  @ApiProperty({ description: 'Parent Course UUID' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
