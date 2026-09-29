import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UnregisterDeviceTokenDto } from './dto/unregister-device-token.dto';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async registerToken(userId: string, dto: RegisterDeviceTokenDto, ipAddress?: string) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: dto.token },
    });

    if (existing) {
      if (existing.userId !== userId) {
        throw new ConflictException(
          'Device token is registered to another user account. Unregister from previous account first.',
        );
      }

      const updated = await this.prisma.deviceToken.update({
        where: { id: existing.id },
        data: { platform: dto.platform },
      });

      await this.auditLogService.log({
        userId,
        action: 'DEVICE_TOKEN_REGISTERED',
        entity: 'DeviceToken',
        entityId: updated.id,
        details: { platform: dto.platform },
        ipAddress,
      });

      return updated;
    }

    const created = await this.prisma.deviceToken.create({
      data: {
        userId,
        token: dto.token,
        platform: dto.platform,
      },
    });

    await this.auditLogService.log({
      userId,
      action: 'DEVICE_TOKEN_REGISTERED',
      entity: 'DeviceToken',
      entityId: created.id,
      details: { platform: dto.platform },
      ipAddress,
    });

    return created;
  }

  async unregisterToken(userId: string, dto: UnregisterDeviceTokenDto, ipAddress?: string) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token: dto.token },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Device token not found for current user');
    }

    await this.prisma.deviceToken.delete({
      where: { id: existing.id },
    });

    await this.auditLogService.log({
      userId,
      action: 'DEVICE_TOKEN_REMOVED',
      entity: 'DeviceToken',
      entityId: existing.id,
      details: {
        platform: existing.platform,
        reason: 'USER_LOGOUT',
      },
      ipAddress,
    });

    return { message: 'Device token removed successfully' };
  }
}
