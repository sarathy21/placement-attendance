import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

describe('Phase 4: Academic Management & Session Scheduling (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let staffId: string;
  let departmentId: string;
  let courseId: string;
  let batchId: string;
  let venueId: string;
  let subjectId: string;

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

    // 2. Fetch seed reference data
    const staff = await prisma.staff.findFirst({ include: { user: true } });
    if (staff) staffId = staff.id;

    const dept = await prisma.department.findUnique({ where: { code: 'MCA' } });
    if (dept) departmentId = dept.id;

    const course = await prisma.course.findUnique({ where: { code: 'MCA-FT' } });
    if (course) courseId = course.id;

    const batch = await prisma.batch.findFirst({ where: { courseId } });
    if (batch) batchId = batch.id;

    // 3. Create test Venue and Subject for session testing
    const venue = await prisma.venue.upsert({
      where: { name: 'Placement Lab 1' },
      update: {},
      create: { name: 'Placement Lab 1', building: 'Tech Block', capacity: 60 },
    });
    venueId = venue.id;

    const subject = await prisma.subject.upsert({
      where: { code: 'TEST-JAVA' },
      update: {},
      create: { code: 'TEST-JAVA', title: 'Test Java Training' },
    });
    subjectId = subject.id;
  });

  describe('Academic Reference Data Management', () => {
    it('GET /departments should list all departments', async () => {
      const res = await request(app.getHttpServer())
        .get('/departments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('POST /departments should allow ADMIN to create new department', async () => {
      const res = await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'ECE', name: 'Electronics and Communication' })
        .expect(201);

      expect(res.body.code).toBe('ECE');
    });

    it('POST /departments should reject duplicate department code', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'ECE', name: 'Duplicate ECE' })
        .expect(409);
    });

    it('POST /departments should reject STAFF role (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ code: 'MECH', name: 'Mechanical' })
        .expect(403);
    });

    it('POST /batches should validate startYear < endYear constraint', async () => {
      await request(app.getHttpServer())
        .post('/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Invalid-Batch',
          startYear: 2025,
          endYear: 2023, // Invalid: startYear > endYear
          courseId,
        })
        .expect(400);
    });
  });

  describe('Venues & Subjects Management', () => {
    it('POST /venues should create a venue when called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/venues')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Auditorium B', building: 'Main Campus', capacity: 250 })
        .expect(201);

      expect(res.body.name).toBe('Auditorium B');
    });

    it('POST /subjects should create a subject module when called by ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .post('/subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: 'APT-01', title: 'Quantitative Aptitude' })
        .expect(201);

      expect(res.body.code).toBe('APT-01');
    });
  });

  describe('Session Scheduling & Time Validation (POST /sessions)', () => {
    it('should reject session creation when startTime >= endTime', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Invalid Time Session',
          subjectId,
          venueId,
          departmentId,
          sessionDate: '2026-10-15',
          startTime: '2026-10-15T14:00:00+05:30',
          endTime: '2026-10-15T13:00:00+05:30', // Earlier than startTime
        })
        .expect(400);
    });

    it('should reject session creation with duration less than 15 minutes', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Too Short Session',
          subjectId,
          venueId,
          departmentId,
          sessionDate: '2026-10-15',
          startTime: '2026-10-15T14:00:00+05:30',
          endTime: '2026-10-15T14:05:00+05:30', // Only 5 minutes
        })
        .expect(400);
    });

    it('should reject session when sessionDate does not match startTime local calendar date in Asia/Kolkata', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Mismatched Date Session',
          subjectId,
          venueId,
          departmentId,
          sessionDate: '2026-10-20', // Date mismatch vs startTime date (2026-10-15)
          startTime: '2026-10-15T10:00:00+05:30',
          endTime: '2026-10-15T11:00:00+05:30',
        })
        .expect(400);
    });

    it('should schedule valid session, materialize roster snapshot for eligible placement students, and force STAFF staffId', async () => {
      const res = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Java Full Stack Morning Session',
          subjectId,
          venueId,
          departmentId,
          courseId,
          batchId,
          sessionDate: '2026-10-15',
          startTime: '2026-10-15T09:00:00+05:30',
          endTime: '2026-10-15T11:00:00+05:30',
        })
        .expect(201);

      expect(res.body.title).toBe('Java Full Stack Morning Session');
      expect(res.body.status).toBe('SCHEDULED');
      expect(res.body.staffId).toBe(staffId); // Forced to staff member's own staffId
      expect(res.body.rosterCount).toBeGreaterThanOrEqual(1);

      // Verify SessionStudent records materialized in DB
      const rosterCountInDb = await prisma.sessionStudent.count({
        where: { sessionId: res.body.id },
      });
      expect(rosterCountInDb).toBe(res.body.rosterCount);
    });

    it('should prevent overlapping active sessions for the same venue', async () => {
      await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Conflicting Venue Session',
          subjectId,
          venueId, // Same venue
          staffId,
          departmentId,
          sessionDate: '2026-10-15',
          startTime: '2026-10-15T10:00:00+05:30', // Overlaps with 09:00-11:00 session
          endTime: '2026-10-15T12:00:00+05:30',
        })
        .expect(400);
    });
  });

  describe('Session Visibility & Roster Membership (GET /sessions/my)', () => {
    it('should return session for student who is in SessionStudent roster', async () => {
      const res = await request(app.getHttpServer())
        .get('/sessions/my')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      const titles = res.body.data.map((s: any) => s.title);
      expect(titles).toContain('Java Full Stack Morning Session');
    });

    it('should return session for staff member who conducts the session', async () => {
      const res = await request(app.getHttpServer())
        .get('/sessions/my')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].staffId).toBe(staffId);
    });
  });

  describe('Session Lifecycle Transitions & Freeze Protections', () => {
    let createdSessionId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'Lifecycle Afternoon Session',
          subjectId,
          venueId,
          departmentId,
          sessionDate: '2026-10-16',
          startTime: '2026-10-16T14:00:00+05:30',
          endTime: '2026-10-16T16:00:00+05:30',
        })
        .expect(201);

      createdSessionId = res.body.id;
    });

    it('should transition status from SCHEDULED to IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
    });

    it('should reject targeting/details update when status is IN_PROGRESS (Frozen Roster)', async () => {
      await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ title: 'Attempted Change' })
        .expect(400);
    });

    it('should transition status from IN_PROGRESS to COMPLETED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
    });

    it('should cancel a session and preserve its record as CANCELLED', async () => {
      const cancelSessionRes = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          title: 'To Be Cancelled Session',
          subjectId,
          venueId,
          departmentId,
          sessionDate: '2026-10-17',
          startTime: '2026-10-17T10:00:00+05:30',
          endTime: '2026-10-17T11:00:00+05:30',
        })
        .expect(201);

      const cancelRes = await request(app.getHttpServer())
        .post(`/sessions/${cancelSessionRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(201);

      expect(cancelRes.body.status).toBe('CANCELLED');

      // Verify record is preserved in DB as CANCELLED
      const dbRecord = await prisma.classSession.findUnique({
        where: { id: cancelSessionRes.body.id },
      });
      expect(dbRecord?.status).toBe('CANCELLED');
    });
  });

  afterAll(async () => {
    // Cleanup created test sessions and reference records
    const testSessions = await prisma.classSession.findMany({
      where: {
        OR: [
          { title: { contains: 'Lifecycle' } },
          { title: { contains: 'Morning' } },
          { title: { contains: 'Conflicting' } },
          { title: { contains: 'Cancelled' } },
          { title: { contains: 'Too Short' } },
          { title: { contains: 'Mismatched' } },
        ],
      },
      select: { id: true },
    });
    const sessionIds = testSessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await prisma.sessionStudent.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.classSession.deleteMany({ where: { id: { in: sessionIds } } });
    }

    await prisma.subject.deleteMany({ where: { code: { in: ['TEST-JAVA', 'APT-01'] } } });
    await prisma.venue.deleteMany({ where: { name: { in: ['Placement Lab 1', 'Auditorium B'] } } });
    await prisma.department.deleteMany({ where: { code: 'ECE' } });

    await app.close();
  });
});
