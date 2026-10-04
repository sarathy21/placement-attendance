import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserStatus, UserRole, Prisma } from '@prisma/client';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(filter: GetStudentsFilterDto) {
    const { departmentId, courseId, placementBatchId, status, isPlacementEligible, search, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {};

    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (placementBatchId) where.placementBatchId = placementBatchId;
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
          placementBatch: true,
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
        placementBatch: true,
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

  async create(dto: CreateStudentDto, operatorUserId: string, ipAddress?: string) {
    const regTrim = dto.registerNumber.trim();
    const emailTrim = dto.collegeEmail.trim().toLowerCase();

    // Check unique registerNumber
    const existingReg = await this.prisma.student.findUnique({
      where: { registerNumber: regTrim },
    });
    if (existingReg) {
      throw new ConflictException(`Student with register number '${regTrim}' already exists`);
    }

    // Check unique email
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: emailTrim },
    });
    if (existingEmail) {
      throw new ConflictException(`Email '${emailTrim}' is already registered`);
    }

    // Academic Validation
    let departmentId = dto.departmentId;
    let courseId = dto.courseId;

    if (departmentId && courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new BadRequestException('Specified Course does not exist');
      if (course.departmentId !== departmentId) {
        throw new BadRequestException(`Course '${course.code}' does not belong to specified Department`);
      }
    } else if (courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) throw new BadRequestException('Specified Course does not exist');
      departmentId = course.departmentId;
    } else if (departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) throw new BadRequestException('Specified Department does not exist');
    }

    if (dto.placementBatchId) {
      const pb = await this.prisma.placementBatch.findUnique({ where: { id: dto.placementBatchId } });
      if (!pb) throw new BadRequestException('Specified Placement Batch does not exist');
    }

    const passwordHash = await argon2.hash(regTrim);

    const student = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: emailTrim,
          passwordHash,
          role: UserRole.STUDENT,
          status: dto.status || UserStatus.ACTIVE,
        },
      });

      return tx.student.create({
        data: {
          userId: user.id,
          registerNumber: regTrim,
          collegeEmail: emailTrim,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName ? dto.lastName.trim() : null,
          phoneNumber: dto.phoneNumber ? dto.phoneNumber.trim() : null,
          departmentId: departmentId || null,
          courseId: courseId || null,
          placementBatchId: dto.placementBatchId || null,
          isPlacementEligible: dto.isPlacementEligible !== undefined ? dto.isPlacementEligible : true,
          status: dto.status || UserStatus.ACTIVE,
        },
        include: {
          department: true,
          course: true,
          placementBatch: true,
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
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'STUDENT_CREATED',
      entity: 'Student',
      entityId: student.id,
      details: {
        registerNumber: student.registerNumber,
        collegeEmail: student.collegeEmail,
        departmentId: student.departmentId,
        courseId: student.courseId,
        placementBatchId: student.placementBatchId,
      },
      ipAddress,
    });

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, operatorUserId: string, ipAddress?: string) {
    const existingStudent = await this.findOne(id);

    const targetDeptId = dto.departmentId !== undefined ? dto.departmentId : existingStudent.departmentId;
    const targetCourseId = dto.courseId !== undefined ? dto.courseId : existingStudent.courseId;

    if (targetDeptId && targetCourseId) {
      const course = await this.prisma.course.findUnique({ where: { id: targetCourseId } });
      if (!course) throw new BadRequestException('Specified Course does not exist');
      if (course.departmentId !== targetDeptId) {
        throw new BadRequestException(`Course '${course.code}' does not belong to specified Department`);
      }
    } else if (dto.courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new BadRequestException('Specified Course does not exist');
    } else if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new BadRequestException('Specified Department does not exist');
    }

    if (dto.placementBatchId) {
      const pb = await this.prisma.placementBatch.findUnique({ where: { id: dto.placementBatchId } });
      if (!pb) throw new BadRequestException('Specified Placement Batch does not exist');
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : undefined,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        placementBatchId: dto.placementBatchId,
        isPlacementEligible: dto.isPlacementEligible,
      },
      include: {
        department: true,
        course: true,
        placementBatch: true,
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
          placementBatch: true,
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
