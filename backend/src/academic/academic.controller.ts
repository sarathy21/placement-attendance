import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Academic Reference Data (Departments, Courses, Batches)')
@ApiBearerAuth()
@Controller()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ==========================================
  // DEPARTMENTS
  // ==========================================

  @Get('departments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List all academic departments' })
  async findAllDepartments() {
    return this.academicService.findAllDepartments();
  }

  @Get('departments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get department by ID' })
  async findOneDepartment(@Param('id') id: string) {
    return this.academicService.findOneDepartment(id);
  }

  @Post('departments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new academic department' })
  async createDepartment(
    @Body() dto: CreateDepartmentDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.academicService.createDepartment(dto, userId, ipAddress);
  }

  @Patch('departments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update academic department' })
  async updateDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.academicService.updateDepartment(id, dto, userId, ipAddress);
  }

  // ==========================================
  // COURSES
  // ==========================================

  @Get('courses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List courses (optionally filter by departmentId)' })
  async findAllCourses(@Query('departmentId') departmentId?: string) {
    return this.academicService.findAllCourses(departmentId);
  }

  @Get('courses/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get course by ID' })
  async findOneCourse(@Param('id') id: string) {
    return this.academicService.findOneCourse(id);
  }

  @Post('courses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new course' })
  async createCourse(
    @Body() dto: CreateCourseDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.academicService.createCourse(dto, userId, ipAddress);
  }

  @Patch('courses/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update course' })
  async updateCourse(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.academicService.updateCourse(id, dto, userId, ipAddress);
  }
}
