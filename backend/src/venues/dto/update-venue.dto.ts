import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'Placement Hall A', description: 'Venue name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Main Block 2nd Floor', description: 'Building location' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ example: 120, description: 'Capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
