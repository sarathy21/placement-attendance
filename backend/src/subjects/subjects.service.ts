import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.subject.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { classSessions: true } },
      },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
    });
    if (!subject) throw new NotFoundException(`Subject with ID '${id}' not found`);
    return subject;
  }

  async create(dto: CreateSubjectDto, operatorUserId: string, ipAddress?: string) {
    const codeUpper = dto.code.trim().toUpperCase();
    const existing = await this.prisma.subject.findUnique({ where: { code: codeUpper } });
    if (existing) {
      throw new ConflictException(`Subject code '${codeUpper}' already exists`);
    }

    const subject = await this.prisma.subject.create({
      data: {
        code: codeUpper,
        title: dto.title.trim(),
        description: dto.description ? dto.description.trim() : null,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'SUBJECT_CREATED',
      entity: 'Subject',
      entityId: subject.id,
      details: { code: subject.code, title: subject.title },
      ipAddress,
    });

    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto, operatorUserId: string, ipAddress?: string) {
    await this.findOne(id);

    let codeUpper: string | undefined;
    if (dto.code) {
      codeUpper = dto.code.trim().toUpperCase();
      const existing = await this.prisma.subject.findUnique({ where: { code: codeUpper } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Subject code '${codeUpper}' is already taken`);
      }
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        code: codeUpper,
        title: dto.title ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? (dto.description ? dto.description.trim() : null) : undefined,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'SUBJECT_UPDATED',
      entity: 'Subject',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }
}
