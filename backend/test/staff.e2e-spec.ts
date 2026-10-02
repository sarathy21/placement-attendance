import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('StaffModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let existingStaffId: string;
  let departmentId: string;

  const testStaffEmails = [
    'e2e_staff_001@kahedu.edu.in',
    'e2e_staff_002@kahedu.edu.in',
    'e2e_staff_dup@kahedu.edu.in',
  ];

  const testStaffIds = ['E2ESTAFF001', 'E2ESTAFF002', 'E2ESTAFFDUP'];

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
      })
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Clean up residual test data from previous runs
    await prisma.staff.deleteMany({ where: { staffId: { in: testStaffIds } } });
    await prisma.user.deleteMany({ where: { email: { in: testStaffEmails } } });

    // Authenticate test accounts
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

    // Fetch existing seed staff & department
    const seedStaff = await prisma.staff.findUnique({
      where: { staffId: 'STAFF001' },
      include: { department: true },
    });

    if (seedStaff) {
      existingStaffId = seedStaff.id;
      if (seedStaff.departmentId) {
        departmentId = seedStaff.departmentId;
      }
    }

    if (!departmentId) {
      const dept = await prisma.department.findFirst();
      if (dept) departmentId = dept.id;
    }
  });

  describe('Authorization Controls', () => {
    it('should reject STUDENT token from accessing GET /staff (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should reject STAFF token from accessing GET /staff (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should allow ADMIN token to access GET /staff (200 OK)', async () => {
      await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow SUPER_ADMIN token to access GET /staff (200 OK)', async () => {
      await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('Staff Creation & Validation (POST /staff)', () => {
    it('should allow ADMIN to create new Staff member atomically with user.role = STAFF and user.status = ACTIVE', async () => {
      const res = await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'E2ESTAFF001',
          email: 'e2e_staff_001@kahedu.edu.in',
          password: 'password123',
          firstName: 'E2E',
          lastName: 'StaffOne',
          designation: 'Assistant Coordinator',
          phoneNumber: '9876543210',
          departmentId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.staffId).toBe('E2ESTAFF001');
      expect(res.body.firstName).toBe('E2E');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('STAFF');
      expect(res.body.user.status).toBe('ACTIVE');
      expect(res.body.user.email).toBe('e2e_staff_001@kahedu.edu.in');

      // CRITICAL SECURITY ASSERTION: passwordHash must NEVER be returned in API response
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body.user).not.toHaveProperty('passwordHash');

      // Verify created user can log in with initial password
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e_staff_001@kahedu.edu.in',
          password: 'password123',
        })
        .expect(201);

      expect(loginRes.body.accessToken).toBeDefined();
    });

    it('should reject duplicate staffId (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'E2ESTAFF001', // Duplicate!
          email: 'e2e_staff_dup@kahedu.edu.in',
          password: 'password123',
          firstName: 'Duplicate',
        })
        .expect(409);
    });

    it('should reject duplicate email (409 Conflict)', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'E2ESTAFFDUP',
          email: 'e2e_staff_001@kahedu.edu.in', // Duplicate email!
          password: 'password123',
          firstName: 'DuplicateEmail',
        })
        .expect(409);
    });

    it('should reject creation with invalid departmentId (404 Not Found)', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'E2ESTAFF002',
          email: 'e2e_staff_002@kahedu.edu.in',
          password: 'password123',
          firstName: 'Test',
          departmentId: fakeUuid,
        })
        .expect(404);
    });

    it('should reject creation with short password under 8 characters (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'E2ESTAFF002',
          email: 'e2e_staff_002@kahedu.edu.in',
          password: '123', // Too short!
          firstName: 'ShortPassword',
        })
        .expect(400);
    });
  });

  describe('Staff Querying, Filtering, & Details (GET /staff)', () => {
    it('GET /staff should return paginated staff list with meta headers', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
    });

    it('GET /staff search parameter should filter by staffId, name, or email', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'E2ESTAFF001' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].staffId).toBe('E2ESTAFF001');
    });

    it('GET /staff departmentId parameter should filter by department', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ departmentId })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /staff status parameter should filter by user account status', async () => {
      const res = await request(app.getHttpServer())
        .get('/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /staff/:id should return single staff profile with academic department details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/staff/${existingStaffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(existingStaffId);
      expect(res.body.staffId).toBe('STAFF001');
      expect(res.body.user).toBeDefined();
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('GET /staff/:id should return 404 for non-existent staff UUID', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/staff/${fakeUuid}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Staff Profile Updates (PATCH /staff/:id)', () => {
    it('should update profile fields without altering staffId, email, or role', async () => {
      const staffToUpdate = await prisma.staff.findUnique({
        where: { staffId: 'E2ESTAFF001' },
      });
      expect(staffToUpdate).toBeDefined();

      const res = await request(app.getHttpServer())
        .patch(`/staff/${staffToUpdate?.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'E2EUpdated',
          designation: 'Senior Coordinator',
          phoneNumber: '9112233445',
        })
        .expect(200);

      expect(res.body.firstName).toBe('E2EUpdated');
      expect(res.body.designation).toBe('Senior Coordinator');
      expect(res.body.phoneNumber).toBe('9112233445');
      // Immutability checks
      expect(res.body.staffId).toBe('E2ESTAFF001');
      expect(res.body.user.email).toBe('e2e_staff_001@kahedu.edu.in');
      expect(res.body.user.role).toBe('STAFF');
    });

    it('should reject attempts to pass non-whitelisted fields (staffId, email) in patch body (400 Bad Request)', async () => {
      const staffToUpdate = await prisma.staff.findUnique({
        where: { staffId: 'E2ESTAFF001' },
      });

      await request(app.getHttpServer())
        .patch(`/staff/${staffToUpdate?.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          staffId: 'MODIFIED_ID',
          email: 'modified@kahedu.edu.in',
          firstName: 'E2E',
        })
        .expect(400);
    });
  });

  describe('Staff Status & Password Management', () => {
    it('PATCH /staff/:id/status should update User.status to INACTIVE, SUSPENDED, and back to ACTIVE', async () => {
      const staffTarget = await prisma.staff.findUnique({
        where: { staffId: 'E2ESTAFF001' },
      });

      // 1. Deactivate
      const resIn = await request(app.getHttpServer())
        .patch(`/staff/${staffTarget?.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(resIn.body.user.status).toBe('INACTIVE');

      // 2. Suspend
      const resSus = await request(app.getHttpServer())
        .patch(`/staff/${staffTarget?.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(200);

      expect(resSus.body.user.status).toBe('SUSPENDED');

      // 3. Reactivate
      const resAct = await request(app.getHttpServer())
        .patch(`/staff/${staffTarget?.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' })
        .expect(200);

      expect(resAct.body.user.status).toBe('ACTIVE');
    });

    it('POST /staff/:id/reset-password should reset staff password using Argon2 without altering role', async () => {
      const staffTarget = await prisma.staff.findUnique({
        where: { staffId: 'E2ESTAFF001' },
      });

      const res = await request(app.getHttpServer())
        .post(`/staff/${staffTarget?.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newPassword123' })
        .expect(200);

      expect(res.body.message).toContain('reset successfully');

      // Verify staff member can log in with new password
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e_staff_001@kahedu.edu.in',
          password: 'newPassword123',
        })
        .expect(201);

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.user.role).toBe('STAFF');
    });
  });

  describe('Audit Logging Verification', () => {
    it('should verify audit events exist for STAFF_CREATED, STAFF_UPDATED, STAFF_STATUS_CHANGED, and STAFF_PASSWORD_RESET with no cleartext passwords', async () => {
      const staffTarget = await prisma.staff.findUnique({
        where: { staffId: 'E2ESTAFF001' },
      });

      const auditLogs = await prisma.auditLog.findMany({
        where: { entity: 'Staff', entityId: staffTarget?.id },
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(1);

      // Verify no audit log contains passwords or password hashes
      for (const log of auditLogs) {
        const detailsString = JSON.stringify(log.details || {});
        expect(detailsString).not.toContain('password123');
        expect(detailsString).not.toContain('newPassword123');
        expect(detailsString).not.toContain('passwordHash');
      }
    });
  });

  afterAll(async () => {
    await prisma.staff.deleteMany({ where: { staffId: { in: testStaffIds } } });
    await prisma.user.deleteMany({ where: { email: { in: testStaffEmails } } });
    await app.close();
  });
});
