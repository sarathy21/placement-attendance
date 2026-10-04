import { PartialType } from '@nestjs/swagger';
import { CreatePlacementBatchDto } from './create-placement-batch.dto';

export class UpdatePlacementBatchDto extends PartialType(CreatePlacementBatchDto) {}
