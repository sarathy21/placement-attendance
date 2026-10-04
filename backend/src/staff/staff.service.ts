import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GetStaffFilterDto } from './dto/get-staff-filter.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { UserRole, UserStatus, Prisma } from '@prisma/client';

const userSelectWithoutPassword = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter: GetStaffFilterDto) {
    const { departmentId, status, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffWhereInput = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status) {
      where.user = { status };
    }

    if (search) {
      const searchTrim = search.trim();
      where.OR = [
        { staffId: { contains: searchTrim, mode: 'insensitive' } },
        { firstName: { contains: searchTrim, mode: 'insensitive' } },
        { lastName: { contains: searchTrim, mode: 'insensitive' } },
        { user: { email: { contains: searchTrim, mode: 'insensitive' } } },
      ];
    }

    const [total, staffList] = await Promise.all([
      this.prisma.staff.count({ where }),
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { staffId: 'asc' },
        include: {
          department: true,
          user: {
            select: userSelectWithoutPassword,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: staffList,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        user: {
          select: userSelectWithoutPassword,
        },
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff member with ID '${id}' not found`);
    }

    return staff;
  }

  async create(dto: CreateStaffDto, operatorUserId: string, ipAddress?: string) {
    const staffIdClean = dto.staffId.trim().toUpperCase();
    const emailClean = dto.email.trim().toLowerCase();

    // Check duplicate staffId
    const existingStaffId = await this.prisma.staff.findUnique({
      where: { staffId: staffIdClean },
    });
    if (existingStaffId) {
      throw new ConflictException(`Staff ID '${staffIdClean}' already exists`);
    }

    // Check duplicate email
    const existingUserEmail = await this.prisma.user.findUnique({
      where: { email: emailClean },
    });
    if (existingUserEmail) {
      throw new ConflictException(`Email '${emailClean}' is already registered`);
    }

    // Validate Department if supplied
    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Department with ID '${dto.departmentId}' not found`);
      }
    }

    // Hash initial password using Argon2
    const passwordHash = await argon2.hash(dto.password);

    // Atomic transaction
    const newStaff = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailClean,
          passwordHash,
          role: UserRole.STAFF,
          status: UserStatus.ACTIVE,
        },
      });

      return tx.staff.create({
        data: {
          userId: user.id,
          staffId: staffIdClean,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName ? dto.lastName.trim() : null,
          designation: dto.designation ? dto.designation.trim() : null,
          phoneNumber: dto.phoneNumber ? dto.phoneNumber.trim() : null,
          departmentId: dto.departmentId || null,
        },
        include: {
          department: true,
          user: {
            select: userSelectWithoutPassword,
          },
        },
      });
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STAFF_CREATED',
      entity: 'Staff',
      entityId: newStaff.id,
      details: {
        staffId: newStaff.staffId,
        email: emailClean,
        departmentId: newStaff.departmentId,
      },
      ipAddress,
    });

    return newStaff;
  }

  async update(id: string, dto: UpdateStaffDto, operatorUserId: string, ipAddress?: string) {
    const existingStaff = await this.findOne(id);

    // Validate Department if supplied
    if (dto.departmentId && dto.departmentId !== existingStaff.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Department with ID '${dto.departmentId}' not found`);
      }
    }

    const updatedStaff = await this.prisma.staff.update({
      where: { id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? (dto.lastName ? dto.lastName.trim() : null) : undefined,
        designation: dto.designation !== undefined ? (dto.designation ? dto.designation.trim() : null) : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? (dto.phoneNumber ? dto.phoneNumber.trim() : null) : undefined,
        departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
      },
      include: {
        department: true,
        user: {
          select: userSelectWithoutPassword,
        },
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STAFF_UPDATED',
      entity: 'Staff',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updatedStaff;
  }

  async updateStatus(
    id: string,
    dto: UpdateStaffStatusDto,
    operatorUserId: string,
    ipAddress?: string
  ) {
    const existingStaff = await this.findOne(id);

    const previousStatus = existingStaff.user.status;
    const newStatus = dto.status;

    await this.prisma.user.update({
      where: { id: existingStaff.userId },
      data: { status: newStatus },
    });

    const updatedStaff = await this.findOne(id);

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STAFF_STATUS_CHANGED',
      entity: 'Staff',
      entityId: id,
      details: {
        staffId: existingStaff.staffId,
        previousStatus,
        newStatus,
      },
      ipAddress,
    });

    return updatedStaff;
  }

  async resetPassword(
    id: string,
    dto: ResetStaffPasswordDto,
    operatorUserId: string,
    ipAddress?: string
  ) {
    const existingStaff = await this.findOne(id);

    const passwordHash = await argon2.hash(dto.password);

    await this.prisma.user.update({
      where: { id: existingStaff.userId },
      data: { passwordHash },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STAFF_PASSWORD_RESET',
      entity: 'Staff',
      entityId: id,
      details: {
        staffId: existingStaff.staffId,
      },
      ipAddress,
    });

    return { message: 'Staff password reset successfully' };
  }
}
