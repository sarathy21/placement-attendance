import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlacementDrivesService } from './placement-drives.service';
import { CreatePlacementDriveDto } from './dto/create-placement-drive.dto';
import { UpdatePlacementDriveDto } from './dto/update-placement-drive.dto';
import { UpdateDriveStatusDto } from './dto/update-drive-status.dto';
import { GetPlacementDrivesFilterDto } from './dto/get-placement-drives-filter.dto';
import { CreateDriveRoundDto } from './dto/create-drive-round.dto';
import { UpdateDriveRoundDto } from './dto/update-drive-round.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Placement Drives & Campus Recruitment Calendar')
@ApiBearerAuth()
@Controller('placement-drives')
export class PlacementDrivesController {
  constructor(private readonly placementDrivesService: PlacementDrivesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create a new placement drive (Staff only)' })
  @ApiResponse({ status: 201, description: 'Placement drive created successfully' })
  async create(
    @Body() dto: CreatePlacementDriveDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.create(dto, currentUser, ipAddress);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List visible placement drives with date filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of placement drives' })
  async findAll(@Query() filter: GetPlacementDrivesFilterDto) {
    return this.placementDrivesService.findAll(filter);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get details of a specific placement drive by ID' })
  @ApiResponse({ status: 200, description: 'Returns placement drive details and rounds' })
  @ApiResponse({ status: 404, description: 'Placement drive not found' })
  async findOne(@Param('id') id: string) {
    return this.placementDrivesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update placement drive details (Conducting Staff only)' })
  @ApiResponse({ status: 200, description: 'Placement drive updated successfully' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlacementDriveDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.update(id, dto, currentUser, ipAddress);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update placement drive status (UPCOMING, ONGOING, COMPLETED, CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Drive status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDriveStatusDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.updateStatus(id, dto.status, currentUser, ipAddress);
  }

  @Post(':id/rounds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Add a new recruitment round to a placement drive' })
  @ApiResponse({ status: 201, description: 'Drive round created successfully' })
  async addRound(
    @Param('id') id: string,
    @Body() dto: CreateDriveRoundDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.addRound(id, dto, currentUser, ipAddress);
  }

  @Patch(':id/rounds/:roundId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update a specific recruitment round' })
  @ApiResponse({ status: 200, description: 'Drive round updated successfully' })
  async updateRound(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: UpdateDriveRoundDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.updateRound(id, roundId, dto, currentUser, ipAddress);
  }

  @Delete(':id/rounds/:roundId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a round from a placement drive' })
  @ApiResponse({ status: 200, description: 'Drive round removed successfully' })
  async deleteRound(
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.placementDrivesService.deleteRound(id, roundId, currentUser, ipAddress);
  }
}
