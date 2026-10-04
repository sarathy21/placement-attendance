import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
        staff: true,
      },
    });

    if (!user) {
      await this.auditLogService.log({
        action: 'LOGIN_FAILURE',
        entity: 'User',
        details: { email, reason: 'User not found' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        entityId: user.id,
        details: { email, reason: 'Invalid password' },
        ipAddress,
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.auditLogService.log({
        userId: user.id,
        action: 'LOGIN_FAILURE',
        entity: 'User',
        entityId: user.id,
        details: { email, reason: `Account status ${user.status}` },
        ipAddress,
      });
      throw new ForbiddenException('Account is not active');
    }

    if (user.role === UserRole.STUDENT) {
      if (!user.student || user.student.status !== UserStatus.ACTIVE || !user.student.isPlacementEligible) {
        await this.auditLogService.log({
          userId: user.id,
          action: 'LOGIN_FAILURE',
          entity: 'Student',
          entityId: user.student?.id ?? undefined,
          details: { email, reason: 'Placement student inactive or ineligible' },
          ipAddress,
        });
        throw new ForbiddenException('Placement student account is not active or eligible');
      }
    }

    const payload = { sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    await this.auditLogService.log({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'User',
      entityId: user.id,
      details: { role: user.role },
      ipAddress,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            department: true,
            course: true,
            placementBatch: true,
          },
        },
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isPasswordValid) {
      await this.auditLogService.log({
        userId,
        action: 'PASSWORD_CHANGE_FAILURE',
        entity: 'User',
        entityId: userId,
        details: { reason: 'Incorrect current password' },
        ipAddress,
      });
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await this.auditLogService.log({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Password updated successfully' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { student: true, staff: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.STUDENT && user.student) {
      const updateData: { phoneNumber?: string | null; avatarUrl?: string | null } = {};
      if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber?.trim() || null;
      if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl?.trim() || null;

      const updatedStudent = await this.prisma.student.update({
        where: { id: user.student.id },
        data: updateData,
        include: {
          department: true,
          course: true,
          placementBatch: true,
        },
      });

      await this.auditLogService.log({
        userId,
        action: 'PROFILE_UPDATED',
        entity: 'Student',
        entityId: user.student.id,
        ipAddress,
      });

      return updatedStudent;
    } else if (user.role === UserRole.STAFF && user.staff) {
      const updateData: { phoneNumber?: string | null } = {};
      if (dto.phoneNumber !== undefined) updateData.phoneNumber = dto.phoneNumber?.trim() || null;

      const updatedStaff = await this.prisma.staff.update({
        where: { id: user.staff.id },
        data: updateData,
        include: {
          department: true,
        },
      });

      await this.auditLogService.log({
        userId,
        action: 'PROFILE_UPDATED',
        entity: 'Staff',
        entityId: user.staff.id,
        ipAddress,
      });

      return updatedStaff;
    }

    throw new ForbiddenException('Profile updates are only available for Student and Staff accounts');
  }
}
