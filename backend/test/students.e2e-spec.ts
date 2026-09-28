import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as ExcelJS from 'exceljs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('StudentsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let existingStudentId: string;
  let departmentId: string;
  let courseId: string;
  let batchId: string;

  jest.setTimeout(40000);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up any residual test records from previous runs
    const testEmails = [
      '25cap501@kahedu.edu.in',
      '25cap502@kahedu.edu.in',
      '25cap301@kahedu.edu.in',
      '25cap401@kahedu.edu.in',
      '25cap801@kahedu.edu.in',
      '25cap601@kahedu.edu.in',
      'dup_email@kahedu.edu.in',
    ];
    await prisma.student.deleteMany({ where: { collegeEmail: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });

    // 1. Authenticate test accounts
    const superAdminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'superadmin@kahedu.edu.in', password: 'password123' });
    superAdminToken = superAdminRes.body.accessToken;

    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@kahedu.edu.in', password: 'password123' });
    adminToken = adminRes.body.accessToken;

    const staffRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'staff001@kahedu.edu.in', password: 'password123' });
    staffToken = staffRes.body.accessToken;

    const studentRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: '25cap109@kahedu.edu.in', password: 'password123' });
    studentToken = studentRes.body.accessToken;

    // 2. Fetch seed reference IDs
    const student = await prisma.student.findUnique({
      where: { registerNumber: '25cap109' },
      include: { department: true, course: true, batch: true },
    });

    if (student) {
      existingStudentId = student.id;
      departmentId = student.departmentId;
      courseId = student.courseId;
      batchId = student.batchId;
    }
  });

  // Helper function to generate in-memory Excel buffers
  async function createExcelBuffer(
    headers: string[],
    rows: (string | number | undefined)[][],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students');
    worksheet.addRow(headers);
    for (const row of rows) {
      worksheet.addRow(row);
    }
    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  describe('Authorization Controls', () => {
    it('should reject STUDENT token from accessing GET /students (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should reject STAFF token from uploading import file (403 Forbidden)', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'departmentCode', 'courseCode', 'batchName'],
        [['25cap201', '25cap201@kahedu.edu.in', 'Test', 'MCA', 'MCA-FT', '2023-2025']],
      );

      await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${staffToken}`)
        .attach('file', buffer, 'test.xlsx')
        .expect(403);
    });

    it('should allow ADMIN token to access GET /students (200 OK)', async () => {
      await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow SUPER_ADMIN token to access GET /students (200 OK)', async () => {
      await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('Excel File Validation & Security (POST /students/import/preview)', () => {
    it('should reject upload without file attachment', async () => {
      await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should reject non-xlsx file (e.g. txt file)', async () => {
      await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('plain text content'), 'invalid.txt')
        .expect(400);
    });

    it('should reject empty Excel file with no data rows', async () => {
      const emptyBuffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'departmentCode', 'courseCode', 'batchName'],
        [],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', emptyBuffer, 'empty.xlsx')
        .expect(400);

      expect(res.body.message).toContain('contains no data rows');
    });

    it('should reject Excel file with missing required header columns', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail'], // Missing firstName, departmentCode, etc.
        [['25cap201', '25cap201@kahedu.edu.in']],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'missing_headers.xlsx')
        .expect(400);

      expect(res.body.message).toContain('missing required column headers');
    });
  });

  describe('Row Validation & Duplicate Detection (POST /students/import/preview)', () => {
    it('CRITICAL: Preview MUST NOT mutate database or create student accounts', async () => {
      const countBefore = await prisma.student.count();

      const validBuffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'lastName', 'departmentCode', 'courseCode', 'batchName'],
        [['25cap801', '25cap801@kahedu.edu.in', 'PreviewOnly', 'Student', 'MCA', 'MCA-FT', '2023-2025']],
      );

      const previewRes = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', validBuffer, 'valid_preview.xlsx')
        .expect(200);

      expect(previewRes.body.canImport).toBe(true);
      expect(previewRes.body.validRows).toBe(1);

      const countAfter = await prisma.student.count();
      expect(countAfter).toBe(countBefore);
    });

    it('should correctly report valid student row preview', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'lastName', 'departmentCode', 'courseCode', 'batchName', 'phoneNumber'],
        [['25cap301', '25cap301@kahedu.edu.in', 'Anand', 'K', 'MCA', 'MCA-FT', '2023-2025', '+919876543210']],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'valid.xlsx')
        .expect(200);

      expect(res.body).toMatchObject({
        totalRows: 1,
        validRows: 1,
        invalidRows: 0,
        duplicateRows: 0,
        canImport: true,
      });

      expect(res.body.rows[0]).toMatchObject({
        rowNumber: 2,
        status: 'VALID',
        errors: [],
        data: {
          registerNumber: '25cap301',
          collegeEmail: '25cap301@kahedu.edu.in',
          firstName: 'Anand',
          lastName: 'K',
          departmentCode: 'MCA',
          courseCode: 'MCA-FT',
          batchName: '2023-2025',
          phoneNumber: '+919876543210',
        },
      });
    });

    it('should detect invalid row fields (missing fields, bad email, phone, unknown relations, relationship mismatches)', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'lastName', 'departmentCode', 'courseCode', 'batchName', 'phoneNumber'],
        [
          ['', 'invalid-email-format', '', 'Test', 'UNKNOWN_DEPT', 'MCA-FT', '2023-2025', 'invalid-phone-string'], // Row 2: invalid email/phone/missing reg/firstName/dept
          ['25cap901', '25cap901@kahedu.edu.in', 'Mismatch1', 'T', 'MCA', 'BTECH-CSE', '2024-2028', '9876543210'], // Row 3: Dept MCA but Course BTECH-CSE mismatch
          ['25cap902', '25cap902@kahedu.edu.in', 'Mismatch2', 'T', 'MCA', 'MCA-FT', '2024-2028', '9876543210'],    // Row 4: Course MCA-FT but Batch 2024-2028 mismatch
        ],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'invalid_rows.xlsx')
        .expect(200);

      expect(res.body.canImport).toBe(false);
      expect(res.body.invalidRows).toBe(3);

      // Row 2 validation check
      expect(res.body.rows[0].status).toBe('INVALID');
      expect(res.body.rows[0].errors).toEqual(
        expect.arrayContaining([
          'Register Number is required',
          "Invalid college email format: 'invalid-email-format'",
          'First Name is required',
          "Department code 'UNKNOWN_DEPT' does not exist in database",
        ]),
      );

      // Row 3 validation check (Dept-Course mismatch)
      expect(res.body.rows[1].status).toBe('INVALID');
      expect(res.body.rows[1].errors).toContain("Course 'BTECH-CSE' does not belong to Department 'MCA'");

      // Row 4 validation check (Course-Batch mismatch)
      expect(res.body.rows[2].status).toBe('INVALID');
      expect(res.body.rows[2].errors).toContain("Batch '2024-2028' does not exist for Course 'MCA-FT'");
    });

    it('should detect duplicate register number and email within Excel file', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'departmentCode', 'courseCode', 'batchName'],
        [
          ['25cap401', 'dup_email@kahedu.edu.in', 'StudentOne', 'MCA', 'MCA-FT', '2023-2025'],
          ['25cap401', 'dup_email@kahedu.edu.in', 'StudentTwo', 'MCA', 'MCA-FT', '2023-2025'], // Duplicate reg and email
        ],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'within_excel_duplicates.xlsx')
        .expect(200);

      expect(res.body.canImport).toBe(false);
      expect(res.body.duplicateRows).toBeGreaterThanOrEqual(1);

      const dupRow = res.body.rows[1];
      expect(dupRow.status).toBe('DUPLICATE');
      expect(dupRow.errors).toEqual(
        expect.arrayContaining([
          "Duplicate Register Number '25cap401' within Excel file",
          "Duplicate email 'dup_email@kahedu.edu.in' within Excel file",
        ]),
      );
    });

    it('should detect duplicates against existing database records', async () => {
      const buffer = await createExcelBuffer(
        ['registerNumber', 'collegeEmail', 'firstName', 'departmentCode', 'courseCode', 'batchName'],
        [
          ['25cap109', '25cap109@kahedu.edu.in', 'ExistingStudent', 'MCA', 'MCA-FT', '2023-2025'], // Already in seed DB
        ],
      );

      const res = await request(app.getHttpServer())
        .post('/students/import/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, 'db_duplicates.xlsx')
        .expect(200);

      expect(res.body.canImport).toBe(false);
      expect(res.body.duplicateRows).toBe(1);

      const dupRow = res.body.rows[0];
      expect(dupRow.status).toBe('DUPLICATE');
      expect(dupRow.errors).toEqual(
        expect.arrayContaining([
          "Register Number '25cap109' already exists in database",
          "College email '25cap109@kahedu.edu.in' already exists in database",
        ]),
      );
    });
  });

  describe('Import Confirmation & Transactional Execution (POST /students/import/confirm)', () => {
    it('should execute transactional import, create User + Student, hash password with Argon2, and enable login', async () => {
      const confirmPayload = {
        rows: [
          {
            registerNumber: '25cap501',
            collegeEmail: '25cap501@kahedu.edu.in',
            firstName: 'Bala',
            lastName: 'M',
            departmentCode: 'MCA',
            courseCode: 'MCA-FT',
            batchName: '2023-2025',
            phoneNumber: '+919123456789',
          },
          {
            registerNumber: '25cap502',
            collegeEmail: '25cap502@kahedu.edu.in',
            firstName: 'Chitra',
            lastName: 'R',
            departmentCode: 'MCA',
            courseCode: 'MCA-FT',
            batchName: '2023-2025',
          },
        ],
      };

      const res = await request(app.getHttpServer())
        .post('/students/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(confirmPayload)
        .expect(201);

      expect(res.body).toEqual({
        success: true,
        count: 2,
        message: expect.stringContaining('Successfully imported 2 placement students'),
      });

      // 1. Verify DB state: User created with ACTIVE status and email = collegeEmail
      const createdUser = await prisma.user.findUnique({
        where: { email: '25cap501@kahedu.edu.in' },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser?.role).toBe('STUDENT');
      expect(createdUser?.status).toBe('ACTIVE');

      // 2. Verify Student record created with isPlacementEligible = true
      const createdStudent = await prisma.student.findUnique({
        where: { registerNumber: '25cap501' },
      });
      expect(createdStudent).toBeDefined();
      expect(createdStudent?.userId).toBe(createdUser?.id);
      expect(createdStudent?.isPlacementEligible).toBe(true);

      // 3. Verify newly created student can log in using registerNumber ('25cap501') as initial password
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: '25cap501@kahedu.edu.in',
          password: '25cap501',
        })
        .expect(201);

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user.email).toBe('25cap501@kahedu.edu.in');
    });

    it('should rollback full transaction when confirmation payload contains invalid/duplicate record', async () => {
      const beforeCount = await prisma.student.count();

      const invalidConfirmPayload = {
        rows: [
          {
            registerNumber: '25cap601',
            collegeEmail: '25cap601@kahedu.edu.in',
            firstName: 'ValidOne',
            departmentCode: 'MCA',
            courseCode: 'MCA-FT',
            batchName: '2023-2025',
          },
          {
            registerNumber: '25cap109', // Duplicate register number existing in DB!
            collegeEmail: '25cap602@kahedu.edu.in',
            firstName: 'DuplicateOne',
            departmentCode: 'MCA',
            courseCode: 'MCA-FT',
            batchName: '2023-2025',
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/students/import/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidConfirmPayload)
        .expect(400);

      // Verify transaction rollback: count of students must remain unchanged and '25cap601' must NOT be in DB
      const afterCount = await prisma.student.count();
      expect(afterCount).toBe(beforeCount);

      const rolledBackUser = await prisma.user.findUnique({
        where: { email: '25cap601@kahedu.edu.in' },
      });
      expect(rolledBackUser).toBeNull();
    });
  });

  describe('Student Management APIs (GET, PATCH)', () => {
    it('GET /students should support filtering, search, and pagination without returning passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .get('/students')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          departmentId,
          search: 'Sarathy',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const studentItem = res.body.data[0];
      expect(studentItem.registerNumber).toBe('25cap109');
      expect(studentItem).not.toHaveProperty('passwordHash');
      expect(studentItem.user).not.toHaveProperty('passwordHash');
    });

    it('GET /students/:id should return single student details with academic relations', async () => {
      const res = await request(app.getHttpServer())
        .get(`/students/${existingStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(existingStudentId);
      expect(res.body.department).toHaveProperty('code');
      expect(res.body.course).toHaveProperty('code');
      expect(res.body.batch).toHaveProperty('name');
      expect(res.body.user).toBeDefined();
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('GET /students/:id should return 404 for non-existent student UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/students/${fakeUuid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('PATCH /students/:id should update student profile fields and validate academic consistency', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${existingStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'SarathyUpdated',
          phoneNumber: '+919988776655',
        })
        .expect(200);

      expect(res.body.firstName).toBe('SarathyUpdated');
      expect(res.body.phoneNumber).toBe('+919988776655');
    });

    it('PATCH /students/:id should reject invalid academic relation update (e.g. course/dept mismatch)', async () => {
      // Get CSE Department and Course
      const cseCourse = await prisma.course.findUnique({ where: { code: 'BTECH-CSE' } });
      expect(cseCourse).toBeDefined();

      await request(app.getHttpServer())
        .patch(`/students/${existingStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentId, // MCA Department
          courseId: cseCourse?.id, // BTECH-CSE Course mismatch!
        })
        .expect(400);
    });

    it('PATCH /students/:id/status should update student status in both User and Student models', async () => {
      // Deactivate student account
      const res = await request(app.getHttpServer())
        .patch(`/students/${existingStudentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.status).toBe('INACTIVE');
      expect(res.body.user.status).toBe('INACTIVE');

      // Reactivate student account back
      await request(app.getHttpServer())
        .patch(`/students/${existingStudentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
    });
  });

  afterAll(async () => {
    const testEmails = [
      '25cap501@kahedu.edu.in',
      '25cap502@kahedu.edu.in',
      '25cap301@kahedu.edu.in',
      '25cap401@kahedu.edu.in',
      '25cap801@kahedu.edu.in',
      '25cap601@kahedu.edu.in',
      'dup_email@kahedu.edu.in',
    ];
    await prisma.student.deleteMany({ where: { collegeEmail: { in: testEmails } } });
    await prisma.user.deleteMany({ where: { email: { in: testEmails } } });
    await app.close();
  });
});
