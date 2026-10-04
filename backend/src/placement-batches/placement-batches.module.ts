import { Module } from '@nestjs/common';
import { PlacementBatchesController } from './placement-batches.controller';
import { PlacementBatchesService } from './placement-batches.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  controllers: [PlacementBatchesController],
  providers: [PlacementBatchesService],
  exports: [PlacementBatchesService],
})
export class PlacementBatchesModule {}
