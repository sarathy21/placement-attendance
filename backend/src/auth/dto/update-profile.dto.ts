import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+919876543210', description: 'Student contact phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatars/student.jpg', description: 'Avatar URL' })
  @IsOptional()
  @IsUrl({}, { message: 'Avatar URL must be a valid URL string' })
  avatarUrl?: string;
}
