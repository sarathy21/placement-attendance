import { PartialType } from '@nestjs/swagger';
import { CreateDriveRoundDto } from './create-drive-round.dto';

export class UpdateDriveRoundDto extends PartialType(CreateDriveRoundDto) {}
