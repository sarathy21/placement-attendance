import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DriveStatus } from '@prisma/client';

export class UpdateDriveStatusDto {
  @ApiProperty({ enum: DriveStatus, example: DriveStatus.ONGOING, description: 'Drive lifecycle status' })
  @IsEnum(DriveStatus)
  @IsNotEmpty()
  status: DriveStatus;
}
