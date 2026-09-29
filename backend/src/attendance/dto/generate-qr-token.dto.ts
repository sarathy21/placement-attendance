import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQrTokenDto {
  @ApiProperty({ description: 'ClassSession UUID' })
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;
}
