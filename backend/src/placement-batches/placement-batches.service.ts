import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreatePlacementBatchDto } from './dto/create-placement-batch.dto';
import { UpdatePlacementBatchDto } from './dto/update-placement-batch.dto';

@Injectable()
export class PlacementBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.placementBatch.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { students: true, classSessions: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const pb = await this.prisma.placementBatch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, classSessions: true },
        },
      },
    });
    if (!pb) throw new NotFoundException(`Placement batch with ID '${id}' not found`);
    return pb;
  }

  async create(dto: CreatePlacementBatchDto, operatorUserId: string, ipAddress?: string) {
    if (dto.startYear !== undefined && dto.endYear !== undefined && dto.startYear > dto.endYear) {
      throw new BadRequestException('startYear cannot be greater than endYear');
    }

    const nameTrim = dto.name.trim();
    const existing = await this.prisma.placementBatch.findUnique({
      where: { name: nameTrim },
    });
    if (existing) {
      throw new ConflictException(`Placement batch with name '${nameTrim}' already exists`);
    }

    const pb = await this.prisma.placementBatch.create({
      data: {
        name: nameTrim,
        startYear: dto.startYear,
        endYear: dto.endYear,
        description: dto.description?.trim(),
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'PLACEMENT_BATCH_CREATED',
      entity: 'PlacementBatch',
      entityId: pb.id,
      details: { name: pb.name, startYear: pb.startYear, endYear: pb.endYear },
      ipAddress,
    });

    return pb;
  }

  async update(id: string, dto: UpdatePlacementBatchDto, operatorUserId: string, ipAddress?: string) {
    const existingPb = await this.findOne(id);

    const start = dto.startYear !== undefined ? dto.startYear : existingPb.startYear;
    const end = dto.endYear !== undefined ? dto.endYear : existingPb.endYear;
    if (start !== null && start !== undefined && end !== null && end !== undefined && start > end) {
      throw new BadRequestException('startYear cannot be greater than endYear');
    }

    let nameTrim: string | undefined;
    if (dto.name) {
      nameTrim = dto.name.trim();
      const duplicate = await this.prisma.placementBatch.findUnique({
        where: { name: nameTrim },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Placement batch with name '${nameTrim}' is already taken`);
      }
    }

    const updated = await this.prisma.placementBatch.update({
      where: { id },
      data: {
        name: nameTrim,
        startYear: dto.startYear,
        endYear: dto.endYear,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'PLACEMENT_BATCH_UPDATED',
      entity: 'PlacementBatch',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }

  async delete(id: string, operatorUserId: string, ipAddress?: string) {
    const pb = await this.findOne(id);

    const studentCount = await this.prisma.student.count({ where: { placementBatchId: id } });
    const sessionCount = await this.prisma.classSession.count({ where: { placementBatchId: id } });

    if (studentCount > 0) {
      throw new ConflictException({
        code: 'PLACEMENT_BATCH_HAS_MEMBERS',
        message: `Cannot delete placement batch '${pb.name}'. This batch is currently assigned to ${studentCount} student${studentCount === 1 ? '' : 's'}. Remove or move the students to another batch before deleting the batch.`,
        details: { memberCount: studentCount, sessionCount },
      });
    }

    if (sessionCount > 0) {
      throw new ConflictException({
        code: 'PLACEMENT_BATCH_HAS_SESSIONS',
        message: `Cannot delete placement batch '${pb.name}'. It is currently referenced by ${sessionCount} class session${sessionCount === 1 ? '' : 's'}.`,
        details: { sessionCount },
      });
    }

    await this.prisma.placementBatch.delete({ where: { id } });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'PLACEMENT_BATCH_DELETED',
      entity: 'PlacementBatch',
      entityId: id,
      details: { name: pb.name },
      ipAddress,
    });

    return { message: `Placement batch '${pb.name}' deleted successfully` };
  }
}
