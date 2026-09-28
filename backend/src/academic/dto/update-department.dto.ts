import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'MCA', description: 'Department code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Master of Computer Applications', description: 'Department full name' })
  @IsOptional()
  @IsString()
  name?: string;
}
