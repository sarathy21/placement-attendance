import { Controller, Get, Post, Patch, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Venues Management')
@ApiBearerAuth()
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List all venues' })
  async findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get venue by ID' })
  async findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new venue' })
  async create(
    @Body() dto: CreateVenueDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.venuesService.create(dto, userId, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update venue' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.venuesService.update(id, dto, userId, ipAddress);
  }
}
