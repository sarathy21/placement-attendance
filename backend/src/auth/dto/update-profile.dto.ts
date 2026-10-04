import { IsOptional, IsString, IsUrl, Matches, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '9876543210', description: 'Student contact 10-digit phone number' })
  @IsOptional()
  @ValidateIf((o) => o.phoneNumber !== undefined && o.phoneNumber !== null && o.phoneNumber !== '')
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must contain exactly 10 digits without spaces or country code' })
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatars/student.jpg', description: 'Avatar URL' })
  @IsOptional()
  @ValidateIf((o) => o.avatarUrl !== undefined && o.avatarUrl !== null && o.avatarUrl !== '')
  @IsUrl({}, { message: 'Avatar URL must be a valid URL string' })
  avatarUrl?: string;
}
