import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter: GetStudentsFilterDto) {
    const { departmentId, courseId, batchId, status, isPlacementEligible, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {};

    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    if (isPlacementEligible !== undefined) where.isPlacementEligible = isPlacementEligible;

    if (search) {
      const searchTrim = search.trim();
      where.OR = [
        { registerNumber: { contains: searchTrim, mode: 'insensitive' } },
        { collegeEmail: { contains: searchTrim, mode: 'insensitive' } },
        { firstName: { contains: searchTrim, mode: 'insensitive' } },
        { lastName: { contains: searchTrim, mode: 'insensitive' } },
      ];
    }

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { registerNumber: 'asc' },
        include: {
          department: true,
          course: true,
          batch: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
        course: true,
        batch: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID '${id}' not found`);
    }

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, operatorUserId: string, ipAddress?: string) {
    const existingStudent = await this.findOne(id);

    const targetDeptId = dto.departmentId || existingStudent.departmentId;
    const targetCourseId = dto.courseId || existingStudent.courseId;
    const targetBatchId = dto.batchId || existingStudent.batchId;

    // Validate Academic Consistency if relations are changing
    if (dto.departmentId || dto.courseId || dto.batchId) {
      const [dept, course, batch] = await Promise.all([
        this.prisma.department.findUnique({ where: { id: targetDeptId } }),
        this.prisma.course.findUnique({ where: { id: targetCourseId } }),
        this.prisma.batch.findUnique({ where: { id: targetBatchId } }),
      ]);

      if (!dept) throw new BadRequestException('Specified Department does not exist');
      if (!course) throw new BadRequestException('Specified Course does not exist');
      if (!batch) throw new BadRequestException('Specified Batch does not exist');

      if (course.departmentId !== dept.id) {
        throw new BadRequestException(`Course '${course.code}' does not belong to Department '${dept.code}'`);
      }
      if (batch.courseId !== course.id) {
        throw new BadRequestException(`Batch '${batch.name}' does not belong to Course '${course.code}'`);
      }
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : undefined,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        batchId: dto.batchId,
        isPlacementEligible: dto.isPlacementEligible,
      },
      include: {
        department: true,
        course: true,
        batch: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    if (
      dto.isPlacementEligible !== undefined &&
      dto.isPlacementEligible !== existingStudent.isPlacementEligible
    ) {
      await this.auditLogService.log({
        userId: operatorUserId,
        action: 'PLACEMENT_ELIGIBILITY_CHANGED',
        entity: 'Student',
        entityId: id,
        details: {
          previousEligibility: existingStudent.isPlacementEligible,
          newEligibility: dto.isPlacementEligible,
        },
        ipAddress,
      });
    }

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STUDENT_UPDATED',
      entity: 'Student',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updatedStudent;
  }

  async updateStatus(id: string, status: UserStatus, operatorUserId: string, ipAddress?: string) {
    const student = await this.findOne(id);

    const updatedStudent = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: student.userId },
        data: { status },
      });

      return tx.student.update({
        where: { id },
        data: { status },
        include: {
          department: true,
          course: true,
          batch: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              status: true,
            },
          },
        },
      });
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STUDENT_STATUS_CHANGED',
      entity: 'Student',
      entityId: id,
      details: { previousStatus: student.status, newStatus: status },
      ipAddress,
    });

    return updatedStudent;
  }
}
