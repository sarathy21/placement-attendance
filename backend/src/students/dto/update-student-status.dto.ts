import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateStudentStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE, description: 'New account status' })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}
