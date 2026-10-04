import { Controller, Get, Post, Patch, Delete, Param, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlacementBatchesService } from './placement-batches.service';
import { CreatePlacementBatchDto } from './dto/create-placement-batch.dto';
import { UpdatePlacementBatchDto } from './dto/update-placement-batch.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Placement Batches')
@ApiBearerAuth()
@Controller('placement-batches')
export class PlacementBatchesController {
  constructor(private readonly service: PlacementBatchesService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'List all placement batches' })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get placement batch by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Create new placement batch' })
  async create(
    @Body() dto: CreatePlacementBatchDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.service.create(dto, userId, ipAddress);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update placement batch' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlacementBatchDto,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.service.update(id, dto, userId, ipAddress);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Delete unused placement batch' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.service.delete(id, userId, ipAddress);
  }
}
