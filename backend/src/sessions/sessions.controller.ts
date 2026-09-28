import { Controller, Get, Post, Patch, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { GetSessionsFilterDto } from './dto/get-sessions-filter.dto';
import { GetMySessionsFilterDto } from './dto/get-my-sessions-filter.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, SessionStatus } from '@prisma/client';

@ApiTags('Placement Session Scheduling & Roster Management')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Schedule a new placement session and materialize student roster' })
  async create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.sessionsService.create(dto, currentUser, ipAddress);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List sessions with filters and pagination' })
  async findAll(@Query() filter: GetSessionsFilterDto) {
    return this.sessionsService.findAll(filter);
  }

  @Get('my')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get current user scheduled sessions (Student roster sessions or Staff conducted sessions)' })
  async findMySessions(
    @Query() filter: GetMySessionsFilterDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.sessionsService.findMySessions(filter, currentUser);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get session details by ID' })
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update session details (allowed only while SCHEDULED and zero attendance)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.sessionsService.update(id, dto, currentUser, ipAddress);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Transition session lifecycle status (SCHEDULED -> IN_PROGRESS -> COMPLETED)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSessionStatusDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.sessionsService.updateStatus(id, dto.status, currentUser, ipAddress);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Cancel a session (preserves record as CANCELLED)' })
  async cancelSession(
    @Param('id') id: string,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.sessionsService.updateStatus(id, SessionStatus.CANCELLED, currentUser, ipAddress);
  }
}
