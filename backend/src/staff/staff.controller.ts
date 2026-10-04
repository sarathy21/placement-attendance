import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { GetStaffFilterDto } from './dto/get-staff-filter.dto';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { UpdateStaffStatusDto } from './dto/update-staff-status.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Staff Management')
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List and search staff members with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of staff members' })
  async findAll(@Query() filter: GetStaffFilterDto) {
    return this.staffService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member profile by ID' })
  @ApiResponse({ status: 200, description: 'Returns single staff record with user and department' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new staff member and linked User account' })
  @ApiResponse({ status: 201, description: 'Staff record created successfully' })
  @ApiResponse({ status: 409, description: 'Staff ID or Email already exists' })
  async create(
    @Body() dto: CreateStaffDto,
    @CurrentUser('id') operatorUserId: string,
    @Req() req: any
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.staffService.create(dto, operatorUserId, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update administrative details of a staff member' })
  @ApiResponse({ status: 200, description: 'Staff record updated successfully' })
  @ApiResponse({ status: 404, description: 'Staff member or Department not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser('id') operatorUserId: string,
    @Req() req: any
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.staffService.update(id, dto, operatorUserId, ipAddress);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update account status of a staff member' })
  @ApiResponse({ status: 200, description: 'Staff account status updated' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto,
    @CurrentUser('id') operatorUserId: string,
    @Req() req: any
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.staffService.updateStatus(id, dto, operatorUserId, ipAddress);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password for a staff member account' })
  @ApiResponse({ status: 200, description: 'Staff password reset successfully' })
  @ApiResponse({ status: 404, description: 'Staff member not found' })
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetStaffPasswordDto,
    @CurrentUser('id') operatorUserId: string,
    @Req() req: any
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.staffService.resetPassword(id, dto, operatorUserId, ipAddress);
  }
}
