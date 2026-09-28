import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { ExcelImportService } from './excel-import.service';

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, ExcelImportService],
  exports: [StudentsService, ExcelImportService],
})
export class StudentsModule {}
