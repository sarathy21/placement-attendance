import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'MCA', description: 'Unique department code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Master of Computer Applications', description: 'Department full name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
