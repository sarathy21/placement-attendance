import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { StudentImportRowDto } from './dto/student-import-row.dto';
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
      } else if (normalized.includes('first')) {
        headerMap.set('firstName', colNumber);
      } else if (normalized.includes('last')) {
        headerMap.set('lastName', colNumber);
      } else if (normalized.includes('dept') || normalized.includes('department')) {
        headerMap.set('departmentCode', colNumber);
      } else if (normalized.includes('course')) {
        headerMap.set('courseCode', colNumber);
      } else if (normalized.includes('batch')) {
        headerMap.set('batchName', colNumber);
      } else if (normalized.includes('phone') || normalized.includes('mobile')) {
        headerMap.set('phoneNumber', colNumber);
      }
    });

    const requiredColumns = ['registerNumber', 'collegeEmail', 'firstName', 'departmentCode', 'courseCode', 'batchName'];
    const missingColumns = requiredColumns.filter((col) => !headerMap.has(col));
    if (missingColumns.length > 0) {
      throw new BadRequestException(
        `Excel sheet is missing required column headers: ${missingColumns.join(', ')}`,
      );
    }

    const dataRowCount = worksheet.rowCount - 1;
    if (dataRowCount > 500) {
      throw new BadRequestException('Excel file exceeds maximum allowed limit of 500 rows per import');
    }

    // 2. Fetch Reference DB Data for Validation
    const [departments, courses, batches, existingUsers, existingStudents] = await Promise.all([
      this.prisma.department.findMany(),
      this.prisma.course.findMany(),
      this.prisma.batch.findMany(),
      this.prisma.user.findMany({ select: { email: true } }),
      this.prisma.student.findMany({ select: { registerNumber: true, collegeEmail: true } }),
    ]);

    const deptMap = new Map(departments.map((d) => [d.code.trim().toUpperCase(), d]));
    const courseMap = new Map(courses.map((c) => [c.code.trim().toUpperCase(), c]));
    const batchMap = new Map(batches.map((b) => [`${b.courseId}_${b.name.trim().toUpperCase()}`, b]));

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
      const firstName = getValue('firstName');
      const lastName = getValue('lastName');
      const departmentCode = getValue('departmentCode').toUpperCase();
      const courseCode = getValue('courseCode').toUpperCase();
      const batchName = getValue('batchName').toUpperCase();
      const phoneNumber = getValue('phoneNumber');

      const data: ParsedStudentRow = {
        registerNumber,
        collegeEmail,
        firstName,
        lastName: lastName || undefined,
        departmentCode,
        courseCode,
        batchName,
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
        errors.push('First Name is required');
      }

      // Phone Number Validation (if provided)
      if (phoneNumber) {
        const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
        if (!phoneRegex.test(phoneNumber)) {
          errors.push(`Invalid phone number format: '${phoneNumber}'`);
        }
      }

      // Academic Consistency Validation
      const dept = deptMap.get(departmentCode);
      if (!departmentCode) {
        errors.push('Department Code is required');
      } else if (!dept) {
        errors.push(`Department code '${departmentCode}' does not exist in database`);
      }

      const course = courseMap.get(courseCode);
      if (!courseCode) {
        errors.push('Course Code is required');
      } else if (!course) {
        errors.push(`Course code '${courseCode}' does not exist in database`);
      } else if (dept && course.departmentId !== dept.id) {
        errors.push(`Course '${courseCode}' does not belong to Department '${departmentCode}'`);
      }

      if (!batchName) {
        errors.push('Batch Name is required');
      } else if (course) {
        const batchKey = `${course.id}_${batchName}`;
        const batch = batchMap.get(batchKey);
        if (!batch) {
          errors.push(`Batch '${batchName}' does not exist for Course '${courseCode}'`);
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
    const [departments, courses, batches, existingUsers, existingStudents] = await Promise.all([
      this.prisma.department.findMany(),
      this.prisma.course.findMany(),
      this.prisma.batch.findMany(),
      this.prisma.user.findMany({ select: { email: true } }),
      this.prisma.student.findMany({ select: { registerNumber: true, collegeEmail: true } }),
    ]);

    const deptMap = new Map(departments.map((d) => [d.code.trim().toUpperCase(), d]));
    const courseMap = new Map(courses.map((c) => [c.code.trim().toUpperCase(), c]));
    const batchMap = new Map(batches.map((b) => [`${b.courseId}_${b.name.trim().toUpperCase()}`, b]));

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
      const deptCode = row.departmentCode.trim().toUpperCase();
      const courseCode = row.courseCode.trim().toUpperCase();
      const batchName = row.batchName.trim().toUpperCase();

      if (existingRegNumbers.has(reg)) {
        throw new BadRequestException(`Import failed: Register Number '${row.registerNumber}' already exists in database`);
      }
      if (existingEmails.has(email)) {
        throw new BadRequestException(`Import failed: College Email '${row.collegeEmail}' already exists in database`);
      }

      const dept = deptMap.get(deptCode);
      if (!dept) {
        throw new BadRequestException(`Import failed: Department Code '${row.departmentCode}' not found`);
      }
      const course = courseMap.get(courseCode);
      if (!course || course.departmentId !== dept.id) {
        throw new BadRequestException(`Import failed: Course '${row.courseCode}' does not belong to Department '${row.departmentCode}'`);
      }
      const batchKey = `${course.id}_${batchName}`;
      const batch = batchMap.get(batchKey);
      if (!batch) {
        throw new BadRequestException(`Import failed: Batch '${row.batchName}' not found for Course '${row.courseCode}'`);
      }
    }

    // 3. Execute Transactional Bulk Onboarding
    try {
      const createdStudentIds: string[] = [];

      await this.prisma.$transaction(async (tx) => {
        for (const row of dto.rows) {
          const email = row.collegeEmail.trim().toLowerCase();
          const regNumber = row.registerNumber.trim();

          const dept = deptMap.get(row.departmentCode.trim().toUpperCase())!;
          const course = courseMap.get(row.courseCode.trim().toUpperCase())!;
          const batch = batchMap.get(`${course.id}_${row.batchName.trim().toUpperCase()}`)!;

          // Generate initial password from registerNumber and hash with Argon2
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
              departmentId: dept.id,
              courseId: course.id,
              batchId: batch.id,
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
