import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

@Injectable()
export class AcademicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==========================================
  // DEPARTMENT METHODS
  // ==========================================

  async findAllDepartments() {
    return this.prisma.department.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { courses: true, students: true, classSessions: true },
        },
      },
    });
  }

  async findOneDepartment(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        courses: { include: { batches: true } },
      },
    });
    if (!dept) throw new NotFoundException(`Department with ID '${id}' not found`);
    return dept;
  }

  async createDepartment(dto: CreateDepartmentDto, operatorUserId: string, ipAddress?: string) {
    const codeUpper = dto.code.trim().toUpperCase();
    const existing = await this.prisma.department.findUnique({ where: { code: codeUpper } });
    if (existing) {
      throw new ConflictException(`Department code '${codeUpper}' already exists`);
    }

    const dept = await this.prisma.department.create({
      data: {
        code: codeUpper,
        name: dto.name.trim(),
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'DEPARTMENT_CREATED',
      entity: 'Department',
      entityId: dept.id,
      details: { code: dept.code, name: dept.name },
      ipAddress,
    });

    return dept;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, operatorUserId: string, ipAddress?: string) {
    await this.findOneDepartment(id);

    let codeUpper: string | undefined;
    if (dto.code) {
      codeUpper = dto.code.trim().toUpperCase();
      const existing = await this.prisma.department.findUnique({ where: { code: codeUpper } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Department code '${codeUpper}' is already taken`);
      }
    }

    const updated = await this.prisma.department.update({
      where: { id },
      data: {
        code: codeUpper,
        name: dto.name ? dto.name.trim() : undefined,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'DEPARTMENT_UPDATED',
      entity: 'Department',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // COURSE METHODS
  // ==========================================

  async findAllCourses(departmentId?: string) {
    return this.prisma.course.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: { code: 'asc' },
      include: {
        department: true,
        batches: true,
      },
    });
  }

  async findOneCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { department: true, batches: true },
    });
    if (!course) throw new NotFoundException(`Course with ID '${id}' not found`);
    return course;
  }

  async createCourse(dto: CreateCourseDto, operatorUserId: string, ipAddress?: string) {
    const codeUpper = dto.code.trim().toUpperCase();
    const existing = await this.prisma.course.findUnique({ where: { code: codeUpper } });
    if (existing) {
      throw new ConflictException(`Course code '${codeUpper}' already exists`);
    }

    const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!dept) throw new BadRequestException(`Department with ID '${dto.departmentId}' does not exist`);

    const course = await this.prisma.course.create({
      data: {
        code: codeUpper,
        name: dto.name.trim(),
        departmentId: dto.departmentId,
      },
      include: { department: true },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'COURSE_CREATED',
      entity: 'Course',
      entityId: course.id,
      details: { code: course.code, name: course.name, departmentId: course.departmentId },
      ipAddress,
    });

    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto, operatorUserId: string, ipAddress?: string) {
    const existingCourse = await this.findOneCourse(id);

    let codeUpper: string | undefined;
    if (dto.code) {
      codeUpper = dto.code.trim().toUpperCase();
      const existing = await this.prisma.course.findUnique({ where: { code: codeUpper } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Course code '${codeUpper}' is already taken`);
      }
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!dept) throw new BadRequestException(`Department with ID '${dto.departmentId}' does not exist`);
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        code: codeUpper,
        name: dto.name ? dto.name.trim() : undefined,
        departmentId: dto.departmentId,
      },
      include: { department: true },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'COURSE_UPDATED',
      entity: 'Course',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // BATCH METHODS
  // ==========================================

  async findAllBatches(courseId?: string) {
    return this.prisma.batch.findMany({
      where: courseId ? { courseId } : undefined,
      orderBy: { name: 'asc' },
      include: { course: { include: { department: true } } },
    });
  }

  async findOneBatch(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: { course: { include: { department: true } } },
    });
    if (!batch) throw new NotFoundException(`Batch with ID '${id}' not found`);
    return batch;
  }

  async createBatch(dto: CreateBatchDto, operatorUserId: string, ipAddress?: string) {
    if (dto.startYear >= dto.endYear) {
      throw new BadRequestException('startYear must be strictly less than endYear');
    }

    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new BadRequestException(`Course with ID '${dto.courseId}' does not exist`);

    const nameTrim = dto.name.trim();
    const existing = await this.prisma.batch.findUnique({
      where: {
        courseId_name: {
          courseId: dto.courseId,
          name: nameTrim,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Batch '${nameTrim}' already exists for Course '${course.code}'`);
    }

    const batch = await this.prisma.batch.create({
      data: {
        name: nameTrim,
        startYear: dto.startYear,
        endYear: dto.endYear,
        courseId: dto.courseId,
      },
      include: { course: true },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'BATCH_CREATED',
      entity: 'Batch',
      entityId: batch.id,
      details: { name: batch.name, courseId: batch.courseId },
      ipAddress,
    });

    return batch;
  }

  async updateBatch(id: string, dto: UpdateBatchDto, operatorUserId: string, ipAddress?: string) {
    const existingBatch = await this.findOneBatch(id);

    const start = dto.startYear !== undefined ? dto.startYear : existingBatch.startYear;
    const end = dto.endYear !== undefined ? dto.endYear : existingBatch.endYear;
    if (start >= end) {
      throw new BadRequestException('startYear must be strictly less than endYear');
    }

    const targetCourseId = dto.courseId || existingBatch.courseId;
    const targetName = dto.name ? dto.name.trim() : existingBatch.name;

    if (dto.courseId || dto.name) {
      const duplicate = await this.prisma.batch.findUnique({
        where: {
          courseId_name: {
            courseId: targetCourseId,
            name: targetName,
          },
        },
      });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException(`Batch '${targetName}' already exists for the selected Course`);
      }
    }

    const updated = await this.prisma.batch.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        startYear: dto.startYear,
        endYear: dto.endYear,
        courseId: dto.courseId,
      },
      include: { course: true },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'BATCH_UPDATED',
      entity: 'Batch',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }
}
