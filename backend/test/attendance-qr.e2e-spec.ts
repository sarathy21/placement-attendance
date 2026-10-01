import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Phase 5: QR Attendance & Attendance Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let studentToken: string;

  let staffUserId: string;
  let staffId: string;
  let studentUserId: string;
  let studentId: string;
  let departmentId: string;
  let courseId: string;
  let batchId: string;
  let venueId: string;
  let subjectId: string;

  let inProgressSessionId: string;
  let scheduledSessionId: string;
  let completedSessionId: string;
  let cancelledSessionId: string;

  jest.setTimeout(45000);

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

    // 1. Authenticate test users
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
    staffUserId = staffRes.body.user.id;

    const studentRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: '25cap109@kahedu.edu.in', password: 'password123' });
    studentToken = studentRes.body.accessToken;
    studentUserId = studentRes.body.user.id;

    // 2. Fetch seed reference data
    const staff = await prisma.staff.findUnique({ where: { userId: staffUserId } });
    if (staff) staffId = staff.id;

    const student = await prisma.student.findUnique({ where: { userId: studentUserId } });
    if (student) {
      studentId = student.id;
      departmentId = student.departmentId;
      courseId = student.courseId;
      batchId = student.batchId;
    }

    const venue = await prisma.venue.upsert({
      where: { name: 'QR Testing Hall' },
      update: {},
      create: { name: 'QR Testing Hall', building: 'Tech Block', capacity: 100 },
    });
    venueId = venue.id;

    const subject = await prisma.subject.upsert({
      where: { code: 'QR-TEST-SUB' },
      update: {},
      create: { code: 'QR-TEST-SUB', title: 'QR Testing Module' },
    });
    subjectId = subject.id;

    // Clean up any stale test sessions from previous runs or other test suites
    const staleSessions = await prisma.classSession.findMany({
      where: {
        title: {
          in: [
            'Phase 5 Active QR Session',
            'Phase 5 Scheduled Session',
            'Phase 5 Completed Session',
            'Phase 5 Cancelled Session',
            'Attendance QR Notif Session',
            'Notifications Test Session',
            'Renamed Title Only Session',
          ],
        },
      },
      select: { id: true },
    });
    const staleIds = staleSessions.map((s) => s.id);
    if (staleIds.length > 0) {
      await prisma.qrAttendanceToken.deleteMany({ where: { sessionId: { in: staleIds } } });
      await prisma.attendance.deleteMany({ where: { sessionId: { in: staleIds } } });
      await prisma.sessionStudent.deleteMany({ where: { sessionId: { in: staleIds } } });
      await prisma.classSession.deleteMany({ where: { id: { in: staleIds } } });
    }

    // 3. Create test sessions for lifecycle states
    const now = new Date();
    const todayStr = now.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    // IN_PROGRESS Session
    const inProgressStart = new Date(now.getTime() - 10 * 60 * 1000);
    const inProgressEnd = new Date(now.getTime() + 50 * 60 * 1000);
    const inProgressDateStr = inProgressStart.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    const inProgressRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Phase 5 Active QR Session',
        subjectId,
        venueId,
        departmentId,
        courseId,
        batchId,
        sessionDate: inProgressDateStr,
        startTime: inProgressStart.toISOString(),
        endTime: inProgressEnd.toISOString(),
      })
      .expect(201);
    inProgressSessionId = inProgressRes.body.id;

    // Transition to IN_PROGRESS
    await request(app.getHttpServer())
      .patch(`/sessions/${inProgressSessionId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);

    // SCHEDULED Session
    const scheduledStart = new Date(now.getTime() + 120 * 60 * 1000);
    const scheduledEnd = new Date(now.getTime() + 180 * 60 * 1000);
    const scheduledDateStr = scheduledStart.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    const scheduledRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Phase 5 Scheduled Session',
        subjectId,
        venueId,
        departmentId,
        courseId,
        batchId,
        sessionDate: scheduledDateStr,
        startTime: scheduledStart.toISOString(),
        endTime: scheduledEnd.toISOString(),
      })
      .expect(201);
    scheduledSessionId = scheduledRes.body.id;

    // COMPLETED Session
    const completedStart = new Date(now.getTime() - 120 * 60 * 1000);
    const completedEnd = new Date(now.getTime() - 60 * 60 * 1000);
    const completedDateStr = completedStart.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    const completedRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Phase 5 Completed Session',
        subjectId,
        venueId,
        departmentId,
        courseId,
        batchId,
        sessionDate: completedDateStr,
        startTime: completedStart.toISOString(),
        endTime: completedEnd.toISOString(),
      })
      .expect(201);
    completedSessionId = completedRes.body.id;

    await request(app.getHttpServer())
      .patch(`/sessions/${completedSessionId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200);

    // CANCELLED Session
    const cancelledStart = new Date(now.getTime() + 200 * 60 * 1000);
    const cancelledEnd = new Date(now.getTime() + 260 * 60 * 1000);
    const cancelledDateStr = cancelledStart.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    const cancelledRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        title: 'Phase 5 Cancelled Session',
        subjectId,
        venueId,
        departmentId,
        courseId,
        batchId,
        sessionDate: cancelledDateStr,
        startTime: cancelledStart.toISOString(),
        endTime: cancelledEnd.toISOString(),
      })
      .expect(201);
    cancelledSessionId = cancelledRes.body.id;

    await request(app.getHttpServer())
      .patch(`/sessions/${cancelledSessionId}/status`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ status: 'CANCELLED' })
      .expect(200);
  });

  describe('QR Token Generation (POST /attendance/qr/token)', () => {
    it('should generate valid QR token for eligible student in IN_PROGRESS session', async () => {
      const res = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      expect(res.body).toHaveProperty('rawToken');
      expect(typeof res.body.rawToken).toBe('string');
      expect(res.body.rawToken.length).toBe(64);
      expect(res.body.ttlSeconds).toBe(60);

      // Verify DB stores ONLY tokenHash and NEVER rawToken
      const tokenHash = crypto.createHash('sha256').update(res.body.rawToken).digest('hex');
      const dbToken = await prisma.qrAttendanceToken.findUnique({
        where: { tokenHash },
      });
      expect(dbToken).toBeDefined();
      expect(dbToken?.isUsed).toBe(false);
      expect(dbToken?.sessionId).toBe(inProgressSessionId);
      expect(dbToken?.studentId).toBe(studentId);
    });

    it('should reject QR token request for SCHEDULED session (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: scheduledSessionId })
        .expect(400);
    });

    it('should reject QR token request for COMPLETED session (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: completedSessionId })
        .expect(400);
    });

    it('should reject QR token request for CANCELLED session (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: cancelledSessionId })
        .expect(400);
    });

    it('should reject QR token request for non-STUDENT role (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(403);
    });

    it('should invalidate previous unused tokens when a new token is generated for same student & session', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      const hash1 = crypto.createHash('sha256').update(res1.body.rawToken).digest('hex');

      const res2 = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      const hash2 = crypto.createHash('sha256').update(res2.body.rawToken).digest('hex');

      const dbToken1 = await prisma.qrAttendanceToken.findUnique({ where: { tokenHash: hash1 } });
      const dbToken2 = await prisma.qrAttendanceToken.findUnique({ where: { tokenHash: hash2 } });

      expect(dbToken1?.isUsed).toBe(true); // Auto-invalidated
      expect(dbToken2?.isUsed).toBe(false); // New active token
    });
  });

  describe('QR Scanning & Authorization (POST /attendance/qr/scan)', () => {
    it('should reject QR scan from ADMIN or SUPER_ADMIN without an active Staff profile (403 Forbidden)', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      // SuperAdmin has no Staff profile
      await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ rawToken: genRes.body.rawToken })
        .expect(403);
    });

    it('should allow conducting STAFF to scan valid QR token and record PRESENT attendance', async () => {
      const genRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      const scanRes = await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: genRes.body.rawToken })
        .expect(201);

      expect(scanRes.body.success).toBe(true);
      expect(scanRes.body.attendance).toBeDefined();
      expect(scanRes.body.attendance.sessionId).toBe(inProgressSessionId);
      expect(scanRes.body.attendance.studentId).toBe(studentId);
      expect(scanRes.body.attendance.markedByStaffId).toBe(staffId);
      expect(scanRes.body.attendance.method).toBe('QR');
      expect(scanRes.body.attendance.status).toBe('PRESENT');

      // Verify DB token is now marked isUsed = true
      const tokenHash = crypto.createHash('sha256').update(genRes.body.rawToken).digest('hex');
      const dbToken = await prisma.qrAttendanceToken.findUnique({ where: { tokenHash } });
      expect(dbToken?.isUsed).toBe(true);
    });

    it('should reject replay scan of already-used QR token (400 Bad Request)', async () => {
      // Re-submit the same token that was consumed in the previous test
      const genRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId });

      // If token generation fails because student already has attendance, clean up attendance for test isolation
      await prisma.attendance.deleteMany({ where: { sessionId: inProgressSessionId } });

      const genRes2 = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      // Scan token once
      await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: genRes2.body.rawToken })
        .expect(201);

      // Scan token SECOND time (Replay Attack)
      const replayRes = await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: genRes2.body.rawToken })
        .expect(400);

      expect(replayRes.body.message).toContain('expired or has already been used');
    });

    it('should reject scan of expired QR token (> 60 seconds)', async () => {
      await prisma.attendance.deleteMany({ where: { sessionId: inProgressSessionId } });

      const genRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      const tokenHash = crypto.createHash('sha256').update(genRes.body.rawToken).digest('hex');

      // Force token expiration in DB for testing
      await prisma.qrAttendanceToken.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 10000) }, // 10 seconds ago
      });

      const scanRes = await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: genRes.body.rawToken })
        .expect(400);

      expect(scanRes.body.message).toContain('expired or has already been used');
    });

    it('should reject scan with malformed rawToken (not 64 hex characters)', async () => {
      await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: 'short-invalid-token' })
        .expect(400);
    });
  });

  describe('Concurrency & Duplicate Protection', () => {
    it('should handle simultaneous concurrent scans of same token atomically (only 1 succeeds)', async () => {
      await prisma.attendance.deleteMany({ where: { sessionId: inProgressSessionId } });

      const genRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      // Execute two simultaneous concurrent scan HTTP requests
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/attendance/qr/scan')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ rawToken: genRes.body.rawToken }),
        request(app.getHttpServer())
          .post('/attendance/qr/scan')
          .set('Authorization', `Bearer ${staffToken}`)
          .send({ rawToken: genRes.body.rawToken }),
      ]);

      const statusCodes = [res1.status, res2.status].sort();
      expect(statusCodes).toEqual([201, 400]); // Exactly one 201 Created and one 400 Bad Request

      // Verify exactly ONE Attendance record exists in DB
      const attendanceCount = await prisma.attendance.count({
        where: { sessionId: inProgressSessionId, studentId },
      });
      expect(attendanceCount).toBe(1);
    });
  });

  describe('Attendance Retrieval & Summary', () => {
    it('GET /sessions/:sessionId/attendance should return roster attendance list and summary stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/${inProgressSessionId}/attendance`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('session');
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('roster');

      expect(res.body.summary.totalRoster).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.presentCount).toBe(1);
      expect(res.body.summary.absentCount).toBe(res.body.summary.totalRoster - 1);
    });

    it('GET /attendance/my should return student personal attendance history', async () => {
      const res = await request(app.getHttpServer())
        .get('/attendance/my')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].sessionTitle).toBe('Phase 5 Active QR Session');
      expect(res.body[0].attendanceStatus).toBe('PRESENT');
    });

    it('GET /sessions/:sessionId/attendance should reject STUDENT role (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/sessions/${inProgressSessionId}/attendance`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('Audit Logging Verification', () => {
    it('AuditLog should record QR generation and attendance events WITHOUT logging raw tokens', async () => {
      const qrAuditLogs = await prisma.auditLog.findMany({
        where: { action: 'ATTENDANCE_QR_GENERATED' },
      });

      expect(qrAuditLogs.length).toBeGreaterThanOrEqual(1);

      // Verify NO rawToken or tokenHash exists in audit log details
      for (const logItem of qrAuditLogs) {
        const detailsStr = JSON.stringify(logItem.details || {});
        expect(detailsStr).not.toContain('rawToken');
        expect(detailsStr).not.toContain('tokenHash');
      }
    });
  });

  afterAll(async () => {
    // Cleanup Phase 5 test records
    const testSessions = await prisma.classSession.findMany({
      where: { title: { contains: 'Phase 5' } },
      select: { id: true },
    });
    const sIds = testSessions.map((s) => s.id);

    if (sIds.length > 0) {
      await prisma.qrAttendanceToken.deleteMany({ where: { sessionId: { in: sIds } } });
      await prisma.attendance.deleteMany({ where: { sessionId: { in: sIds } } });
      await prisma.sessionStudent.deleteMany({ where: { sessionId: { in: sIds } } });
      await prisma.classSession.deleteMany({ where: { id: { in: sIds } } });
    }

    await prisma.subject.deleteMany({ where: { code: 'QR-TEST-SUB' } });
    await prisma.venue.deleteMany({ where: { name: 'QR Testing Hall' } });

    await app.close();
  });
});
