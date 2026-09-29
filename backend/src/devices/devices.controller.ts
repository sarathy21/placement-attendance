import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { DevicesService } from './devices.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('devices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('tokens')
  @HttpCode(HttpStatus.CREATED)
  async registerToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceTokenDto,
    @Req() req: Request,
  ) {
    return this.devicesService.registerToken(userId, dto, req.ip);
  }

  @Delete('tokens')
  @HttpCode(HttpStatus.OK)
  async unregisterToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterDeviceTokenDto,
    @Req() req: Request,
  ) {
    return this.devicesService.unregisterToken(userId, dto, req.ip);
  }
}
