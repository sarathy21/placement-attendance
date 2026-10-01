import { Module } from '@nestjs/common';
import { PlacementDrivesService } from './placement-drives.service';
import { PlacementDrivesController } from './placement-drives.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [PlacementDrivesController],
  providers: [PlacementDrivesService],
  exports: [PlacementDrivesService],
})
export class PlacementDrivesModule {}
