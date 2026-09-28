import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.prisma.venue.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { classSessions: true } },
      },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
    });
    if (!venue) throw new NotFoundException(`Venue with ID '${id}' not found`);
    return venue;
  }

  async create(dto: CreateVenueDto, operatorUserId: string, ipAddress?: string) {
    const nameTrim = dto.name.trim();
    const existing = await this.prisma.venue.findUnique({ where: { name: nameTrim } });
    if (existing) {
      throw new ConflictException(`Venue with name '${nameTrim}' already exists`);
    }

    const venue = await this.prisma.venue.create({
      data: {
        name: nameTrim,
        building: dto.building ? dto.building.trim() : null,
        capacity: dto.capacity || null,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'VENUE_CREATED',
      entity: 'Venue',
      entityId: venue.id,
      details: { name: venue.name, building: venue.building, capacity: venue.capacity },
      ipAddress,
    });

    return venue;
  }

  async update(id: string, dto: UpdateVenueDto, operatorUserId: string, ipAddress?: string) {
    await this.findOne(id);

    if (dto.name) {
      const nameTrim = dto.name.trim();
      const existing = await this.prisma.venue.findUnique({ where: { name: nameTrim } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Venue name '${nameTrim}' is already taken`);
      }
    }

    const updated = await this.prisma.venue.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        building: dto.building !== undefined ? (dto.building ? dto.building.trim() : null) : undefined,
        capacity: dto.capacity !== undefined ? dto.capacity : undefined,
      },
    });

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'VENUE_UPDATED',
      entity: 'Venue',
      entityId: id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress,
    });

    return updated;
  }
}
