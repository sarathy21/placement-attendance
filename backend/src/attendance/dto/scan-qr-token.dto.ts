import { IsHexadecimal, IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScanQrTokenDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
    description: 'Raw 64-character hexadecimal QR token scanned from student device',
  })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64, { message: 'rawToken must be exactly 64 characters long' })
  @IsHexadecimal({ message: 'rawToken must contain only hexadecimal characters' })
  rawToken: string;
}
