import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

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
        courses: true,
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
      },
    });
  }

  async findOneCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { department: true },
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

  async deleteDepartment(id: string, operatorUserId: string, ipAddress?: string) {
    const dept = await this.findOneDepartment(id);

    const studentCount = await this.prisma.student.count({ where: { departmentId: id } });
    const staffCount = await this.prisma.staff.count({ where: { departmentId: id } });
    const sessionCount = await this.prisma.classSession.count({ where: { departmentId: id } });

    if (studentCount > 0 || staffCount > 0 || sessionCount > 0) {
      throw new ConflictException({
        code: 'DEPARTMENT_HAS_DEPENDENT_RECORDS',
        message: `Cannot delete department '${dept.name}'.\n\nThis department is currently used by:\n• ${studentCount} student${studentCount === 1 ? '' : 's'}\n• ${staffCount} staff member${staffCount === 1 ? '' : 's'}\n• ${sessionCount} session${sessionCount === 1 ? '' : 's'}\n\nRemove or reassign the dependent records first.`,
        details: { studentCount, staffCount, sessionCount },
      });
    }

    await this.prisma.department.delete({ where: { id } });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'DEPARTMENT_DELETED',
      entity: 'Department',
      entityId: id,
      details: { code: dept.code, name: dept.name },
      ipAddress,
    });

    return { message: `Department '${dept.name}' deleted successfully` };
  }
}
