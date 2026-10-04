import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';

export class UpdateStaffStatusDto {
  @ApiProperty({ enum: UserStatus, description: 'Account status (ACTIVE, INACTIVE, SUSPENDED)' })
  @IsEnum(UserStatus)
  @IsNotEmpty()
  status: UserStatus;
}
