import { IsInt, IsNotEmpty, IsOptional, IsString, IsISO8601, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDriveRoundDto {
  @ApiProperty({ example: 'Aptitude Test', description: 'Name of the round' })
  @IsString()
  @IsNotEmpty()
  roundName: string;

  @ApiProperty({ example: 1, description: 'Order index of the round' })
  @IsInt()
  @Min(1)
  roundOrder: number;

  @ApiPropertyOptional({ example: '2026-10-15T09:00:00.000Z', description: 'Scheduled date/time for this round' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: 'Placement Hall B', description: 'Venue for this round' })
  @IsOptional()
  @IsString()
  venue?: string;

  @ApiPropertyOptional({ example: 'Online aptitude test consisting of 60 questions.', description: 'Round details' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'b23cbc39-68a9-4710-9cae-05d6c38c24ff', description: 'Optional linked ClassSession ID if attendance is tracked' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
