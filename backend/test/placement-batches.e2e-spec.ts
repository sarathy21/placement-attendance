import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PlacementBatchesModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let createdBatchId: string;
  let testDepartmentId: string;
  let testCourseId: string;
  let testSubjectId: string;
  let testVenueId: string;
  let testStaffId: string;

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

    // Clean up test batches if any
    await prisma.placementBatch.deleteMany({
      where: { name: { in: ['E2E-Batch-Test-1', 'E2E-Batch-Test-2', 'Referenced-Student-Batch', 'Referenced-Session-Batch'] } },
    });

    // Login users
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

    // Fetch reference IDs for dependency tests
    const dept = await prisma.department.findFirst();
    const course = await prisma.course.findFirst();
    const subject = await prisma.subject.findFirst();
    const venue = await prisma.venue.findFirst();
    const staff = await prisma.staff.findFirst();

    if (dept && course && subject && venue && staff) {
      testDepartmentId = dept.id;
      testCourseId = course.id;
      testSubjectId = subject.id;
      testVenueId = venue.id;
      testStaffId = staff.id;
    }
  });

  describe('RBAC Authorization', () => {
    it('should reject STUDENT from POST /placement-batches (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'E2E-Batch-Test-1' })
        .expect(403);
    });

    it('should reject STAFF from POST /placement-batches (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'E2E-Batch-Test-1' })
        .expect(403);
    });

    it('should reject unauthenticated caller from GET /placement-batches (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .get('/placement-batches')
        .expect(401);
    });
  });

  describe('CRUD & Business Rules', () => {
    it('ADMIN should create placement batch with optional startYear, endYear, description (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Batch-Test-1',
          startYear: 2024,
          endYear: 2026,
          description: 'E2E Test Batch Description',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('E2E-Batch-Test-1');
      expect(res.body.startYear).toBe(2024);
      expect(res.body.endYear).toBe(2026);
      expect(res.body.description).toBe('E2E Test Batch Description');

      createdBatchId = res.body.id;
    });

    it('should reject creating duplicate placement batch name (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'E2E-Batch-Test-1',
        })
        .expect(409);

      expect(res.body.message).toContain('already exists');
    });

    it('SUPER_ADMIN should list placement batches (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/placement-batches')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: any) => b.id === createdBatchId)).toBe(true);
    });

    it('GET /placement-batches/:id should return single batch detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/placement-batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdBatchId);
      expect(res.body.name).toBe('E2E-Batch-Test-1');
    });

    it('PATCH /placement-batches/:id should update placement batch', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/placement-batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated Description',
        })
        .expect(200);

      expect(res.body.description).toBe('Updated Description');
    });

    it('DELETE /placement-batches/:id should delete unused placement batch (200 OK)', async () => {
      await request(app.getHttpServer())
        .delete(`/placement-batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/placement-batches/${createdBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Safe Deletion & Dependency Protection (409 Conflict)', () => {
    let studentRefBatchId: string;
    let sessionRefBatchId: string;
    let createdStudentId: string;
    let createdSessionId: string;

    beforeAll(async () => {
      // Create batch referenced by student
      const b1 = await prisma.placementBatch.create({
        data: { name: 'Referenced-Student-Batch' },
      });
      studentRefBatchId = b1.id;

      // Create test user and student referencing studentRefBatchId
      const testUser = await prisma.user.create({
        data: {
          email: 'batch_test_student@kahedu.edu.in',
          passwordHash: 'dummy_hash',
          role: 'STUDENT',
          status: 'ACTIVE',
        },
      });

      const student = await prisma.student.create({
        data: {
          userId: testUser.id,
          registerNumber: 'TESTPB001',
          firstName: 'BatchTest',
          collegeEmail: 'batch_test_student@kahedu.edu.in',
          placementBatchId: studentRefBatchId,
          status: 'ACTIVE',
        },
      });
      createdStudentId = student.id;

      // Create batch referenced by class session
      const b2 = await prisma.placementBatch.create({
        data: { name: 'Referenced-Session-Batch' },
      });
      sessionRefBatchId = b2.id;

      const session = await prisma.classSession.create({
        data: {
          title: 'Batch Ref Session Test',
          subjectId: testSubjectId,
          venueId: testVenueId,
          staffId: testStaffId,
          placementBatchId: sessionRefBatchId,
          sessionDate: new Date(),
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          status: 'SCHEDULED',
        },
      });
      createdSessionId = session.id;
    });

    it('should reject deletion of placement batch referenced by Student (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/placement-batches/${studentRefBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('Cannot delete placement batch');
      expect(res.body.message).toContain('student');
    });

    it('should reject deletion of placement batch referenced by ClassSession (409 Conflict)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/placement-batches/${sessionRefBatchId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      expect(res.body.message).toContain('Cannot delete placement batch');
      expect(res.body.message).toContain('session');
    });

    afterAll(async () => {
      // Clean up session, student, user, and batches
      if (createdSessionId) {
        await prisma.classSession.delete({ where: { id: createdSessionId } }).catch(() => {});
      }
      if (createdStudentId) {
        await prisma.student.delete({ where: { id: createdStudentId } }).catch(() => {});
        await prisma.user.deleteMany({ where: { email: 'batch_test_student@kahedu.edu.in' } }).catch(() => {});
      }
      await prisma.placementBatch.deleteMany({
        where: { id: { in: [studentRefBatchId, sessionRefBatchId] } },
      }).catch(() => {});
    });
  });

  afterAll(async () => {
    await prisma.placementBatch.deleteMany({
      where: { name: { in: ['E2E-Batch-Test-1', 'E2E-Batch-Test-2', 'Referenced-Student-Batch', 'Referenced-Session-Batch'] } },
    });
    await app.close();
  });
});
