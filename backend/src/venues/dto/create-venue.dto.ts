import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVenueDto {
  @ApiProperty({ example: 'Placement Hall A', description: 'Unique venue name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Main Block 2nd Floor', description: 'Building/location details' })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiPropertyOptional({ example: 120, description: 'Seating capacity' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
