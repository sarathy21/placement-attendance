import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PlacementBatchesModule & Staff RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let batchAId: string;
  let batchBId: string;
  let testStudentId: string;
  let testUserId: string;

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

    // Clean up test batches & users if existing
    await prisma.student.deleteMany({
      where: { registerNumber: { in: ['E2E-STAFF-STUD1'] } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: ['e2e_staff_stud1@kahedu.edu.in'] } },
    });
    await prisma.placementBatch.deleteMany({
      where: { name: { in: ['Staff-Batch-A', 'Staff-Batch-A-Renamed', 'Staff-Batch-B', 'Staff-Batch-ToDelete', 'Admin-Batch-1', 'SuperAdmin-Batch-1'] } },
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

    // Create a test student for membership tests
    const user = await prisma.user.create({
      data: {
        email: 'e2e_staff_stud1@kahedu.edu.in',
        passwordHash: 'dummy_hash',
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
    testUserId = user.id;

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        registerNumber: 'E2E-STAFF-STUD1',
        firstName: 'StaffTest',
        lastName: 'Student',
        collegeEmail: 'e2e_staff_stud1@kahedu.edu.in',
        status: 'ACTIVE',
        isPlacementEligible: true,
      },
    });
    testStudentId = student.id;
  });

  describe('Staff Placement Batch CRUD & Membership Authorization', () => {
    it('STAFF can create batch (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff-Batch-A',
          startYear: 2024,
          endYear: 2026,
          description: 'Created by Staff',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Staff-Batch-A');
      batchAId = res.body.id;
    });

    it('STAFF can create a second batch (201 Created)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff-Batch-B',
          startYear: 2024,
          endYear: 2026,
          description: 'Second Batch Created by Staff',
        })
        .expect(201);

      batchBId = res.body.id;
    });

    it('STAFF can rename/edit a placement batch (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/placement-batches/${batchAId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff-Batch-A-Renamed',
          description: 'Updated by Staff',
        })
        .expect(200);

      expect(res.body.name).toBe('Staff-Batch-A-Renamed');
      expect(res.body.description).toBe('Updated by Staff');
    });

    it('STAFF can list and view placement batch details (200 OK)', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/placement-batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.some((b: any) => b.id === batchAId)).toBe(true);

      const detailRes = await request(app.getHttpServer())
        .get(`/placement-batches/${batchAId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(detailRes.body.id).toBe(batchAId);
    });

    it('STAFF can add an existing student to a placement batch (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ placementBatchId: batchAId })
        .expect(200);

      expect(res.body.placementBatchId).toBe(batchAId);
    });

    it('STAFF can move an existing student from Batch A to Batch B (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ placementBatchId: batchBId })
        .expect(200);

      expect(res.body.placementBatchId).toBe(batchBId);
    });

    it('STAFF can remove an existing student from placement batch (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ placementBatchId: null })
        .expect(200);

      expect(res.body.placementBatchId).toBeNull();
    });

    it('STAFF can delete an unused batch (200 OK)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Staff-Batch-ToDelete' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/placement-batches/${createRes.body.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });

  describe('STAFF Field & Action Restriction Checks', () => {
    it('STAFF cannot create a student through batch management or direct API (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/students')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          registerNumber: 'ILLEGAL001',
          collegeEmail: 'illegal001@kahedu.edu.in',
          firstName: 'Illegal',
          placementBatchId: batchAId,
        })
        .expect(403);
    });

    it('STAFF cannot modify student identity/academic fields (firstName, status, eligibility) via student update (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          firstName: 'HackedName',
          placementBatchId: batchAId,
        })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          isPlacementEligible: false,
        })
        .expect(403);
    });

    it('STAFF cannot update student status via /students/:id/status (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/students/${testStudentId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'SUSPENDED' })
        .expect(403);
    });
  });

  describe('ADMIN & SUPER_ADMIN Verification', () => {
    it('ADMIN still works for batch creation & student update (201 Created / 200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin-Batch-1' })
        .expect(201);

      expect(res.body.name).toBe('Admin-Batch-1');

      // Admin can update student details including firstName
      await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'AdminUpdated', placementBatchId: res.body.id })
        .expect(200);
    });

    it('SUPER_ADMIN still works for batch creation & deletion (201 / 200)', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'SuperAdmin-Batch-1' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/placement-batches/${res.body.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('Unauthorized Roles Blocked', () => {
    it('STUDENT is rejected from batch creation (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/placement-batches')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Student-Batch' })
        .expect(403);
    });

    it('STUDENT is rejected from updating student placement batch (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/students/${testStudentId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ placementBatchId: batchAId })
        .expect(403);
    });

    it('Unauthenticated caller is rejected (401 Unauthorized)', async () => {
      await request(app.getHttpServer())
        .post('/placement-batches')
        .send({ name: 'NoAuth-Batch' })
        .expect(401);
    });
  });

  afterAll(async () => {
    if (testStudentId) {
      await prisma.student.delete({ where: { id: testStudentId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.placementBatch.deleteMany({
      where: { name: { in: ['Staff-Batch-A', 'Staff-Batch-A-Renamed', 'Staff-Batch-B', 'Staff-Batch-ToDelete', 'Admin-Batch-1', 'SuperAdmin-Batch-1'] } },
    }).catch(() => {});

    await app.close();
  });
});
