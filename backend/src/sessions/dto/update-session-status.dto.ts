import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '@prisma/client';

export class UpdateSessionStatusDto {
  @ApiProperty({ enum: SessionStatus, example: SessionStatus.IN_PROGRESS, description: 'New session status' })
  @IsEnum(SessionStatus)
  @IsNotEmpty()
  status: SessionStatus;
}
