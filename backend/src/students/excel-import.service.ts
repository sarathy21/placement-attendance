import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { ImportPreviewResponse, ParsedStudentRow, StudentRowPreview } from './interfaces/import-preview.interface';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async parseAndValidateExcel(fileBuffer: Buffer, operatorUserId?: string, ipAddress?: string): Promise<ImportPreviewResponse> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(fileBuffer as any);
    } catch (err) {
      throw new BadRequestException('Invalid Excel file. Please upload a valid .xlsx file.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount <= 1) {
      throw new BadRequestException('Excel file contains no data rows to import');
    }

    // 1. Column header mapping
    const headerRow = worksheet.getRow(1);
    const headerMap = new Map<string, number>();

    headerRow.eachCell((cell, colNumber) => {
      const headerStr = (cell.text || cell.value?.toString() || '').trim().toLowerCase();
      const normalized = headerStr.replace(/[^a-z0-9]/g, '');

      if (normalized.includes('reg') || normalized.includes('register')) {
        headerMap.set('registerNumber', colNumber);
      } else if (normalized.includes('email')) {
        headerMap.set('collegeEmail', colNumber);
      } else if (normalized.includes('placementbatch') || (normalized.includes('placement') && normalized.includes('batch'))) {
        headerMap.set('placementBatchName', colNumber);
      } else if (normalized.includes('batch')) {
        headerMap.set('placementBatchName', colNumber);
      } else if (normalized.includes('first')) {
        headerMap.set('firstName', colNumber);
      } else if (normalized.includes('last')) {
        headerMap.set('lastName', colNumber);
      } else if (normalized.includes('name')) {
        headerMap.set('name', colNumber);
      } else if (normalized.includes('dept') || normalized.includes('department')) {
        headerMap.set('departmentCode', colNumber);
      } else if (normalized.includes('course')) {
        headerMap.set('courseCode', colNumber);
      } else if (normalized.includes('phone') || normalized.includes('mobile')) {
        headerMap.set('phoneNumber', colNumber);
      }
    });

    const hasName = headerMap.has('firstName') || headerMap.has('name');
    if (!headerMap.has('registerNumber') || !headerMap.has('collegeEmail') || !hasName) {
      throw new BadRequestException('Excel sheet is missing required column headers: Register No, Name, Email');
    }

    const dataRowCount = worksheet.rowCount - 1;
    if (dataRowCount > 500) {
      throw new BadRequestException('Excel file exceeds maximum allowed limit of 500 rows per import');
    }

    // 2. Fetch Reference DB Data for Validation
    const [departments, courses, placementBatches, existingUsers, existingStudents] = await Promise.all([
      this.prisma.department.findMany(),
      this.prisma.course.findMany(),
      this.prisma.placementBatch.findMany(),
      this.prisma.user.findMany({ select: { email: true } }),
      this.prisma.student.findMany({ select: { registerNumber: true, collegeEmail: true } }),
    ]);

    const deptByCode = new Map(departments.map((d) => [d.code.trim().toUpperCase(), d]));
    const deptByName = new Map(departments.map((d) => [d.name.trim().toUpperCase(), d]));

    const courseByCode = new Map(courses.map((c) => [c.code.trim().toUpperCase(), c]));
    const courseByName = new Map(courses.map((c) => [c.name.trim().toUpperCase(), c]));

    const pbByName = new Map(placementBatches.map((p) => [p.name.trim().toUpperCase(), p]));

    const existingEmails = new Set([
      ...existingUsers.map((u) => u.email.trim().toLowerCase()),
      ...existingStudents.map((s) => s.collegeEmail.trim().toLowerCase()),
    ]);
    const existingRegNumbers = new Set(
      existingStudents.map((s) => s.registerNumber.trim().toUpperCase()),
    );

    const seenFileEmails = new Set<string>();
    const seenFileRegNumbers = new Set<string>();

    const rowPreviews: StudentRowPreview[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    // 3. Process Rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const getValue = (key: string): string => {
        const colIndex = headerMap.get(key);
        if (!colIndex) return '';
        const cell = row.getCell(colIndex);
        return (cell.text || cell.value?.toString() || '').trim();
      };

      const registerNumber = getValue('registerNumber');
      const collegeEmail = getValue('collegeEmail').toLowerCase();
      let firstName = getValue('firstName');
      let lastName: string | undefined = getValue('lastName');
      const fullName = getValue('name');

      if (!firstName && fullName) {
        const parts = fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || undefined;
      }

      const departmentVal = getValue('departmentCode');
      const courseVal = getValue('courseCode');
      const placementBatchVal = getValue('placementBatchName');
      const phoneNumber = getValue('phoneNumber');

      const data: ParsedStudentRow = {
        registerNumber,
        collegeEmail,
        firstName,
        lastName: lastName || undefined,
        departmentCode: departmentVal || undefined,
        courseCode: courseVal || undefined,
        placementBatchName: placementBatchVal || undefined,
        phoneNumber: phoneNumber || undefined,
      };

      const errors: string[] = [];
      let isDuplicate = false;

      // Register Number Validation
      if (!registerNumber) {
        errors.push('Register Number is required');
      } else {
        const upperReg = registerNumber.toUpperCase();
        if (seenFileRegNumbers.has(upperReg)) {
          errors.push(`Duplicate Register Number '${registerNumber}' within Excel file`);
          isDuplicate = true;
        } else if (existingRegNumbers.has(upperReg)) {
          errors.push(`Register Number '${registerNumber}' already exists in database`);
          isDuplicate = true;
        }
        seenFileRegNumbers.add(upperReg);
      }

      // College Email Validation
      if (!collegeEmail) {
        errors.push('College Email is required');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(collegeEmail)) {
          errors.push(`Invalid college email format: '${collegeEmail}'`);
        } else {
          if (seenFileEmails.has(collegeEmail)) {
            errors.push(`Duplicate email '${collegeEmail}' within Excel file`);
            isDuplicate = true;
          } else if (existingEmails.has(collegeEmail)) {
            errors.push(`College email '${collegeEmail}' already exists in database`);
            isDuplicate = true;
          }
          seenFileEmails.add(collegeEmail);
        }
      }

      // First Name Validation
      if (!firstName) {
        errors.push('Name is required');
      }

      // Phone Number Validation (if provided)
      if (phoneNumber) {
        const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
          errors.push(`Invalid phone number format: '${phoneNumber}'`);
        }
      }

      // Department Validation (if supplied)
      let dept: any = null;
      if (departmentVal) {
        const upperDept = departmentVal.toUpperCase();
        dept = deptByCode.get(upperDept) || deptByName.get(upperDept);
        if (!dept) {
          errors.push(`Unknown department '${departmentVal}'`);
        }
      }

      // Course Validation (if supplied)
      let course: any = null;
      if (courseVal) {
        const upperCourse = courseVal.toUpperCase();
        course = courseByCode.get(upperCourse) || courseByName.get(upperCourse);
        if (!course) {
          errors.push(`Unknown course '${courseVal}'`);
        }
      }

      // Inconsistent Department / Course Validation
      if (dept && course && course.departmentId !== dept.id) {
        errors.push(`Inconsistent department/course: Course '${courseVal}' does not belong to Department '${departmentVal}'`);
      }

      // Placement Batch Validation (if supplied)
      if (placementBatchVal) {
        const upperPb = placementBatchVal.toUpperCase();
        const pb = pbByName.get(upperPb);
        if (!pb) {
          errors.push(`Unknown placement batch '${placementBatchVal}'`);
        }
      }

      let status: 'VALID' | 'INVALID' | 'DUPLICATE' = 'VALID';
      if (errors.length > 0) {
        if (isDuplicate) {
          status = 'DUPLICATE';
          duplicateCount++;
        } else {
          status = 'INVALID';
          invalidCount++;
        }
      } else {
        validCount++;
      }

      rowPreviews.push({
        rowNumber,
        status,
        data,
        errors,
      });
    });

    const canImport = invalidCount === 0 && duplicateCount === 0 && validCount > 0;

    const response: ImportPreviewResponse = {
      totalRows: rowPreviews.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      canImport,
      rows: rowPreviews,
    };

    await this.auditLogService.log({
      userId: operatorUserId,
      action: 'IMPORT_PREVIEW_CREATED',
      entity: 'Student',
      details: {
        totalRows: response.totalRows,
        validRows: response.validRows,
        invalidRows: response.invalidRows,
        duplicateRows: response.duplicateRows,
        canImport: response.canImport,
      },
      ipAddress,
    });

    return response;
  }

  async executeImport(dto: ConfirmImportDto, operatorUserId: string, ipAddress?: string) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('No student rows provided for import confirmation');
    }

    // 1. Fetch DB records for re-validation and mapping
    const [departments, courses, placementBatches, existingUsers, existingStudents] = await Promise.all([
      this.prisma.department.findMany(),
      this.prisma.course.findMany(),
      this.prisma.placementBatch.findMany(),
      this.prisma.user.findMany({ select: { email: true } }),
      this.prisma.student.findMany({ select: { registerNumber: true, collegeEmail: true } }),
    ]);

    const deptByCode = new Map(departments.map((d) => [d.code.trim().toUpperCase(), d]));
    const deptByName = new Map(departments.map((d) => [d.name.trim().toUpperCase(), d]));

    const courseByCode = new Map(courses.map((c) => [c.code.trim().toUpperCase(), c]));
    const courseByName = new Map(courses.map((c) => [c.name.trim().toUpperCase(), c]));

    const pbByName = new Map(placementBatches.map((p) => [p.name.trim().toUpperCase(), p]));

    const existingEmails = new Set([
      ...existingUsers.map((u) => u.email.trim().toLowerCase()),
      ...existingStudents.map((s) => s.collegeEmail.trim().toLowerCase()),
    ]);
    const existingRegNumbers = new Set(
      existingStudents.map((s) => s.registerNumber.trim().toUpperCase()),
    );

    // 2. Validate all rows before running database transaction
    for (let i = 0; i < dto.rows.length; i++) {
      const row = dto.rows[i];
      const reg = row.registerNumber.trim().toUpperCase();
      const email = row.collegeEmail.trim().toLowerCase();
      const deptVal = row.departmentCode ? row.departmentCode.trim().toUpperCase() : undefined;
      const courseVal = row.courseCode ? row.courseCode.trim().toUpperCase() : undefined;
      const pbVal = row.placementBatchName ? row.placementBatchName.trim().toUpperCase() : undefined;

      if (existingRegNumbers.has(reg)) {
        throw new BadRequestException(`Import failed: Register Number '${row.registerNumber}' already exists in database`);
      }
      if (existingEmails.has(email)) {
        throw new BadRequestException(`Import failed: College Email '${row.collegeEmail}' already exists in database`);
      }

      let dept: any = null;
      if (deptVal) {
        dept = deptByCode.get(deptVal) || deptByName.get(deptVal);
        if (!dept) {
          throw new BadRequestException(`Import failed: Department '${row.departmentCode}' not found`);
        }
      }

      let course: any = null;
      if (courseVal) {
        course = courseByCode.get(courseVal) || courseByName.get(courseVal);
        if (!course) {
          throw new BadRequestException(`Import failed: Course '${row.courseCode}' not found`);
        }
      }

      if (dept && course && course.departmentId !== dept.id) {
        throw new BadRequestException(`Import failed: Course '${row.courseCode}' does not belong to Department '${row.departmentCode}'`);
      }

      if (pbVal) {
        const pb = pbByName.get(pbVal);
        if (!pb) {
          throw new BadRequestException(`Import failed: Placement Batch '${row.placementBatchName}' not found`);
        }
      }
    }

    // 3. Execute Transactional Bulk Onboarding
    try {
      const createdStudentIds: string[] = [];

      await this.prisma.$transaction(async (tx) => {
        for (const row of dto.rows) {
          const email = row.collegeEmail.trim().toLowerCase();
          const regNumber = row.registerNumber.trim();

          const deptVal = row.departmentCode ? row.departmentCode.trim().toUpperCase() : undefined;
          const courseVal = row.courseCode ? row.courseCode.trim().toUpperCase() : undefined;
          const pbVal = row.placementBatchName ? row.placementBatchName.trim().toUpperCase() : undefined;

          const dept = deptVal ? (deptByCode.get(deptVal) || deptByName.get(deptVal)) : null;
          const course = courseVal ? (courseByCode.get(courseVal) || courseByName.get(courseVal)) : null;
          const pb = pbVal ? pbByName.get(pbVal) : null;

          const passwordHash = await argon2.hash(regNumber);

          const user = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: UserRole.STUDENT,
              status: UserStatus.ACTIVE,
            },
          });

          const student = await tx.student.create({
            data: {
              userId: user.id,
              registerNumber: regNumber,
              collegeEmail: email,
              firstName: row.firstName.trim(),
              lastName: row.lastName?.trim() || null,
              phoneNumber: row.phoneNumber?.trim() || null,
              departmentId: dept ? dept.id : (course ? course.departmentId : null),
              courseId: course ? course.id : null,
              placementBatchId: pb ? pb.id : null,
              isPlacementEligible: true,
              status: UserStatus.ACTIVE,
            },
          });

          createdStudentIds.push(student.id);
        }
      });

      for (let i = 0; i < dto.rows.length; i++) {
        await this.auditLogService.log({
          userId: operatorUserId,
          action: 'STUDENT_CREATED',
          entity: 'Student',
          entityId: createdStudentIds[i],
          details: { registerNumber: dto.rows[i].registerNumber, collegeEmail: dto.rows[i].collegeEmail },
          ipAddress,
        });
      }

      await this.auditLogService.log({
        userId: operatorUserId,
        action: 'IMPORT_CONFIRMED',
        entity: 'Student',
        details: {
          importedCount: dto.rows.length,
          operatorUserId,
        },
        ipAddress,
      });

      return {
        success: true,
        count: dto.rows.length,
        message: `Successfully imported ${dto.rows.length} placement students. Accounts created and activated.`,
      };
    } catch (error) {
      await this.auditLogService.log({
        userId: operatorUserId,
        action: 'IMPORT_FAILED',
        entity: 'Student',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        ipAddress,
      });
      throw error;
    }
  }
}
