import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePlacementDriveDto } from './dto/create-placement-drive.dto';
import { UpdatePlacementDriveDto } from './dto/update-placement-drive.dto';
import { GetPlacementDrivesFilterDto } from './dto/get-placement-drives-filter.dto';
import { CreateDriveRoundDto } from './dto/create-drive-round.dto';
import { UpdateDriveRoundDto } from './dto/update-drive-round.dto';
import { DriveStatus, UserRole, UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class PlacementDrivesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==========================================
  // HELPER: Resolve active Staff profile for currentUser
  // ==========================================
  private async getActiveStaffProfile(currentUser: any) {
    if (currentUser.role === UserRole.STUDENT) {
      throw new ForbiddenException('Students cannot create or manage placement drives');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { userId: currentUser.id },
      include: { user: true },
    });

    if (!staff || staff.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('An active Staff profile is required to manage placement drives');
    }

    return staff;
  }

  // ==========================================
  // HELPER: Verify ClassSession ownership for STAFF role
  // ==========================================
  private async validateSessionOwnership(sessionId: string, currentUser: any) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`ClassSession with ID '${sessionId}' not found`);
    }

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (session.staffId !== staff.id) {
        throw new ForbiddenException('STAFF can only link ClassSessions they conduct');
      }
    }

    return session;
  }

  // ==========================================
  // 1. CREATE PLACEMENT DRIVE & ROUNDS
  // ==========================================
  async create(dto: CreatePlacementDriveDto, currentUser: any, ipAddress?: string) {
    const staff = await this.getActiveStaffProfile(currentUser);

    const driveDateObj = new Date(dto.driveDate);
    if (isNaN(driveDateObj.getTime())) {
      throw new BadRequestException('Invalid driveDate format');
    }

    const attendanceEnabled = dto.attendanceEnabled ?? false;

    if (dto.rounds && dto.rounds.length > 0) {
      for (const r of dto.rounds) {
        if (r.sessionId) {
          await this.validateSessionOwnership(r.sessionId, currentUser);
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const drive = await tx.placementDrive.create({
        data: {
          companyName: dto.companyName.trim(),
          driveDate: driveDateObj,
          venue: dto.venue.trim(),
          description: dto.description ? dto.description.trim() : null,
          status: DriveStatus.UPCOMING,
          attendanceEnabled,
          createdById: staff.id,
        },
      });

      if (dto.rounds && dto.rounds.length > 0) {
        await tx.placementDriveRound.createMany({
          data: dto.rounds.map((r) => ({
            driveId: drive.id,
            roundName: r.roundName.trim(),
            roundOrder: r.roundOrder,
            date: r.date ? new Date(r.date) : null,
            venue: r.venue ? r.venue.trim() : null,
            description: r.description ? r.description.trim() : null,
            sessionId: r.sessionId || null,
          })),
        });
      }

      return tx.placementDrive.findUnique({
        where: { id: drive.id },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, staffId: true } },
          rounds: { orderBy: { roundOrder: 'asc' }, include: { session: true } },
        },
      });
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'PLACEMENT_DRIVE_CREATED',
      entity: 'PlacementDrive',
      entityId: result!.id,
      details: {
        companyName: result!.companyName,
        attendanceEnabled: result!.attendanceEnabled,
        roundsCount: result!.rounds.length,
      },
      ipAddress,
    });

    return result;
  }

  // ==========================================
  // 2. FIND ALL PLACEMENT DRIVES (FILTER & PAGINATE)
  // ==========================================
  async findAll(filter: GetPlacementDrivesFilterDto) {
    const { status, companyName, fromDate, toDate, attendanceEnabled, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PlacementDriveWhereInput = {};

    if (status) where.status = status;
    if (attendanceEnabled !== undefined) where.attendanceEnabled = attendanceEnabled;

    if (companyName) {
      where.companyName = { contains: companyName.trim(), mode: 'insensitive' };
    }

    if (fromDate || toDate) {
      where.driveDate = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    const [total, drives] = await Promise.all([
      this.prisma.placementDrive.count({ where }),
      this.prisma.placementDrive.findMany({
        where,
        skip,
        take: limit,
        orderBy: { driveDate: 'asc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, staffId: true } },
          rounds: { orderBy: { roundOrder: 'asc' }, include: { session: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: drives,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // ==========================================
  // 3. FIND ONE PLACEMENT DRIVE BY ID
  // ==========================================
  async findOne(id: string) {
    const drive = await this.prisma.placementDrive.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, staffId: true } },
        rounds: { orderBy: { roundOrder: 'asc' }, include: { session: true } },
      },
    });

    if (!drive) {
      throw new NotFoundException(`PlacementDrive with ID '${id}' not found`);
    }

    return drive;
  }

  // ==========================================
  // 4. UPDATE PLACEMENT DRIVE
  // ==========================================
  async update(id: string, dto: UpdatePlacementDriveDto, currentUser: any, ipAddress?: string) {
    const drive = await this.findOne(id);

    // Resource Authorization: STAFF can only update drives they created
    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (drive.createdById !== staff.id) {
        throw new ForbiddenException('STAFF can only update placement drives they created');
      }
    }

    const driveDateObj = dto.driveDate ? new Date(dto.driveDate) : undefined;
    if (driveDateObj && isNaN(driveDateObj.getTime())) {
      throw new BadRequestException('Invalid driveDate format');
    }

    const updated = await this.prisma.placementDrive.update({
      where: { id },
      data: {
        companyName: dto.companyName ? dto.companyName.trim() : undefined,
        driveDate: driveDateObj,
        venue: dto.venue ? dto.venue.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        attendanceEnabled: dto.attendanceEnabled !== undefined ? dto.attendanceEnabled : undefined,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, staffId: true } },
        rounds: { orderBy: { roundOrder: 'asc' }, include: { session: true } },
      },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'PLACEMENT_DRIVE_UPDATED',
      entity: 'PlacementDrive',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 5. UPDATE DRIVE STATUS (LIFECYCLE)
  // ==========================================
  async updateStatus(id: string, status: DriveStatus, currentUser: any, ipAddress?: string) {
    const drive = await this.findOne(id);

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (drive.createdById !== staff.id) {
        throw new ForbiddenException('STAFF can only update status of placement drives they created');
      }
    }

    const updated = await this.prisma.placementDrive.update({
      where: { id },
      data: { status },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, staffId: true } },
        rounds: { orderBy: { roundOrder: 'asc' }, include: { session: true } },
      },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: status === DriveStatus.CANCELLED ? 'PLACEMENT_DRIVE_CANCELLED' : 'PLACEMENT_DRIVE_STATUS_CHANGED',
      entity: 'PlacementDrive',
      entityId: id,
      details: { previousStatus: drive.status, newStatus: status },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 6. ADD ROUND TO DRIVE
  // ==========================================
  async addRound(driveId: string, dto: CreateDriveRoundDto, currentUser: any, ipAddress?: string) {
    const drive = await this.findOne(driveId);

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (drive.createdById !== staff.id) {
        throw new ForbiddenException('STAFF can only add rounds to placement drives they created');
      }
    }

    if (dto.sessionId) {
      await this.validateSessionOwnership(dto.sessionId, currentUser);
    }

    const round = await this.prisma.placementDriveRound.create({
      data: {
        driveId,
        roundName: dto.roundName.trim(),
        roundOrder: dto.roundOrder,
        date: dto.date ? new Date(dto.date) : null,
        venue: dto.venue ? dto.venue.trim() : null,
        description: dto.description ? dto.description.trim() : null,
        sessionId: dto.sessionId || null,
      },
      include: { session: true },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'PLACEMENT_DRIVE_ROUND_ADDED',
      entity: 'PlacementDriveRound',
      entityId: round.id,
      details: { driveId, roundName: round.roundName, roundOrder: round.roundOrder },
      ipAddress,
    });

    return round;
  }

  // ==========================================
  // 7. UPDATE ROUND
  // ==========================================
  async updateRound(
    driveId: string,
    roundId: string,
    dto: UpdateDriveRoundDto,
    currentUser: any,
    ipAddress?: string,
  ) {
    const drive = await this.findOne(driveId);

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (drive.createdById !== staff.id) {
        throw new ForbiddenException('STAFF can only update rounds of placement drives they created');
      }
    }

    const round = await this.prisma.placementDriveRound.findFirst({
      where: { id: roundId, driveId },
    });

    if (!round) {
      throw new NotFoundException(`PlacementDriveRound '${roundId}' not found for drive '${driveId}'`);
    }

    if (dto.sessionId) {
      await this.validateSessionOwnership(dto.sessionId, currentUser);
    }

    const updated = await this.prisma.placementDriveRound.update({
      where: { id: roundId },
      data: {
        roundName: dto.roundName ? dto.roundName.trim() : undefined,
        roundOrder: dto.roundOrder !== undefined ? dto.roundOrder : undefined,
        date: dto.date !== undefined ? (dto.date ? new Date(dto.date) : null) : undefined,
        venue: dto.venue !== undefined ? (dto.venue ? dto.venue.trim() : null) : undefined,
        description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
        sessionId: dto.sessionId !== undefined ? dto.sessionId || null : undefined,
      },
      include: { session: true },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'PLACEMENT_DRIVE_ROUND_UPDATED',
      entity: 'PlacementDriveRound',
      entityId: roundId,
      details: { driveId, updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 8. DELETE ROUND
  // ==========================================
  async deleteRound(driveId: string, roundId: string, currentUser: any, ipAddress?: string) {
    const drive = await this.findOne(driveId);

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.getActiveStaffProfile(currentUser);
      if (drive.createdById !== staff.id) {
        throw new ForbiddenException('STAFF can only delete rounds from placement drives they created');
      }
    }

    const round = await this.prisma.placementDriveRound.findFirst({
      where: { id: roundId, driveId },
    });

    if (!round) {
      throw new NotFoundException(`PlacementDriveRound '${roundId}' not found for drive '${driveId}'`);
    }

    await this.prisma.placementDriveRound.delete({
      where: { id: roundId },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'PLACEMENT_DRIVE_ROUND_REMOVED',
      entity: 'PlacementDriveRound',
      entityId: roundId,
      details: { driveId, roundName: round.roundName },
      ipAddress,
    });

    return { message: 'PlacementDriveRound removed successfully' };
  }
}
