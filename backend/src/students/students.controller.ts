import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { ExcelImportService } from './excel-import.service';
import { GetStudentsFilterDto } from './dto/get-students-filter.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpdateStudentStatusDto } from './dto/update-student-status.dto';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Student Onboarding & Management')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly excelImportService: ExcelImportService,
  ) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List and search placement students with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of placement students' })
  async findAll(@Query() filter: GetStudentsFilterDto) {
    return this.studentsService.findAll(filter);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get placement student profile by ID' })
  @ApiResponse({ status: 200, description: 'Returns single student record with academic relations' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a single placement student' })
  @ApiResponse({ status: 201, description: 'Student created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error or academic mismatch' })
  @ApiResponse({ status: 409, description: 'Register number or email already exists' })
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.studentsService.create(dto, userId, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update administrative details of a placement student' })
  @ApiResponse({ status: 200, description: 'Student record updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or academic relationship mismatch' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Req() req: any,
  ) {
    if (userRole === UserRole.STAFF) {
      const keys = Object.keys(dto).filter(
        (key) => dto[key as keyof UpdateStudentDto] !== undefined,
      );
      const illegalKeys = keys.filter((key) => key !== 'placementBatchId');
      if (illegalKeys.length > 0) {
        throw new ForbiddenException(
          'Staff members are only authorized to modify student placement batch assignments',
        );
      }
    }
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.studentsService.update(id, dto, userId, ipAddress);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update student account status (ACTIVE, INACTIVE, SUSPENDED)' })
  @ApiResponse({ status: 200, description: 'Student status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStudentStatusDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.studentsService.updateStatus(id, dto.status, userId, ipAddress);
  }

  @Post('import/preview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Excel (.xlsx) file and generate import preview/validation report' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file (.xlsx) containing placement student rows',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns detailed validation report and import preview' })
  @ApiResponse({ status: 400, description: 'Invalid file format, empty sheet, or missing headers' })
  async uploadAndPreview(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Please upload an Excel file (.xlsx)');
    }

    const filename = file.originalname.toLowerCase();
    if (!filename.endsWith('.xlsx')) {
      throw new BadRequestException('Only .xlsx Excel files are supported');
    }

    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.excelImportService.parseAndValidateExcel(file.buffer, userId, ipAddress);
  }

  @Post('import/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm and execute transactional bulk import of validated student rows' })
  @ApiResponse({ status: 200, description: 'Students imported and activated successfully' })
  @ApiResponse({ status: 400, description: 'Import rejected due to validation or duplicate errors' })
  async confirmImport(
    @Body() dto: ConfirmImportDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.excelImportService.executeImport(dto, userId, ipAddress);
  }
}
