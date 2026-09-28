import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Subjects / Placement Training Modules')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List all subjects/training modules' })
  async findAll() {
    return this.subjectsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get subject by ID' })
  async findOne(@Param('id') id: string) {
    return this.subjectsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new subject/training module' })
  async create(
    @Body() dto: CreateSubjectDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.subjectsService.create(dto, userId, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update subject' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.subjectsService.update(id, dto, userId, ipAddress);
  }
}
