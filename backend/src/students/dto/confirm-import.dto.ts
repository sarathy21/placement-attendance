import { IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StudentImportRowDto } from './student-import-row.dto';

export class ConfirmImportDto {
  @ApiProperty({ type: [StudentImportRowDto], description: 'Validated list of student rows to import' })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one student row must be provided for import confirmation' })
  @ValidateNested({ each: true })
  @Type(() => StudentImportRowDto)
  rows: StudentImportRowDto[];
}
