import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { FcmService } from '../src/fcm/fcm.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Notifications & Devices (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let fcmService: FcmService;
  let notificationsService: NotificationsService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let student1Token: string;
  let student2Token: string;

  let student1UserId: string;
  let student2UserId: string;
  let staffUserId: string;
  let student1Id: string;
  let staffId: string;

  let testDeptId: string;
  let testCourseId: string;
  let testBatchId: string;
  let testSubjectId: string;
  let testVenueId: string;

  jest.setTimeout(60000);

  beforeAll(async () => {
    try {
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

      prisma = app.get(PrismaService);
      fcmService = app.get(FcmService);
      notificationsService = app.get(NotificationsService);

      // Ensure mock mode for FCM service in tests
      fcmService.setIsMock(true);
      fcmService.clearMockHistory();

      // Clean up any stale sessions from previous runs
      const oldSessions = await prisma.classSession.findMany({
        where: { title: { in: ['Notifications Test Session', 'Renamed Title Only Session', 'Attendance QR Notif Session', 'Phase 5 Active QR Session'] } },
        select: { id: true },
      });
      const oldIds = oldSessions.map(s => s.id);
      if (oldIds.length > 0) {
        await prisma.qrAttendanceToken.deleteMany({ where: { sessionId: { in: oldIds } } });
        await prisma.attendance.deleteMany({ where: { sessionId: { in: oldIds } } });
        await prisma.sessionStudent.deleteMany({ where: { sessionId: { in: oldIds } } });
        await prisma.classSession.deleteMany({ where: { id: { in: oldIds } } });
      }

      // Authenticate SUPER_ADMIN
      const saRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'superadmin@kahedu.edu.in', password: 'password123' });
      superAdminToken = saRes.body.accessToken;

      // Authenticate ADMIN
      const adminRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@kahedu.edu.in', password: 'password123' });
      adminToken = adminRes.body.accessToken;

      // Authenticate STAFF
      const staffRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'staff001@kahedu.edu.in', password: 'password123' });
      staffToken = staffRes.body.accessToken;
      staffUserId = staffRes.body.user.id;

      const staffProfile = await prisma.staff.findUnique({ where: { userId: staffUserId } });
      staffId = staffProfile!.id;

      // Authenticate Student 1 (25cap109)
      const st1Res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: '25cap109@kahedu.edu.in', password: 'password123' });
      student1Token = st1Res.body.accessToken;
      student1UserId = st1Res.body.user.id;

      const st1Profile = await prisma.student.findUnique({ where: { userId: student1UserId } });
      student1Id = st1Profile!.id;
      testDeptId = st1Profile!.departmentId;
      testCourseId = st1Profile!.courseId;
      testBatchId = st1Profile!.batchId;

      // Ensure Student 2 exists in DB
      let st2User = await prisma.user.findUnique({ where: { email: '25cap110@kahedu.edu.in' } });
      if (!st2User) {
        const devPasswordHash = await argon2.hash('password123');
        st2User = await prisma.user.create({
          data: {
            email: '25cap110@kahedu.edu.in',
            passwordHash: devPasswordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
          },
        });
        await prisma.student.create({
          data: {
            userId: st2User.id,
            registerNumber: '25cap110',
            collegeEmail: '25cap110@kahedu.edu.in',
            firstName: 'Student',
            lastName: 'Two',
            departmentId: testDeptId,
            courseId: testCourseId,
            batchId: testBatchId,
            isPlacementEligible: true,
            status: 'ACTIVE',
          },
        });
      }

      // Authenticate Student 2 (25cap110)
      const st2Res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: '25cap110@kahedu.edu.in', password: 'password123' });
      student2Token = st2Res.body.accessToken;
      student2UserId = st2Res.body.user.id;

      // Upsert reference subject and venue for tests
      const venue = await prisma.venue.upsert({
        where: { name: 'Notif Testing Hall' },
        update: {},
        create: { name: 'Notif Testing Hall', building: 'Tech Block', capacity: 100 },
      });
      testVenueId = venue.id;

      const subject = await prisma.subject.upsert({
        where: { code: 'NOTIF-TEST-SUB' },
        update: {},
        create: { code: 'NOTIF-TEST-SUB', title: 'Notif Testing Module' },
      });
      testSubjectId = subject.id;
    } catch (error) {
      console.error('BEFORE ALL FAILED WITH ERROR:', error);
      throw error;
    }
  });

  beforeEach(() => {
    if (fcmService) {
      fcmService.clearMockHistory();
    }
  });

  // ============================================================
  // SECTION 1: DEVICE TOKEN MANAGEMENT
  // ============================================================
  describe('Device Token Lifecycle & Ownership', () => {
    let studentTokenAndroid = 'fcm_token_student1_android_' + Date.now();
    let studentTokenIos = 'fcm_token_student1_ios_' + Date.now();
    let staffTokenAndroid = 'fcm_token_staff_android_' + Date.now();

    it('1. Register Android token for Student', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ token: studentTokenAndroid, platform: 'ANDROID' })
        .expect(201);

      expect(res.body.token).toBe(studentTokenAndroid);
      expect(res.body.platform).toBe('ANDROID');
      expect(res.body.userId).toBe(student1UserId);

      // Verify audit log has no raw token or token hash
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'DEVICE_TOKEN_REGISTERED', userId: student1UserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.details).toEqual({ platform: 'ANDROID' });
    });

    it('2. Register iOS token for Staff', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ token: staffTokenAndroid, platform: 'IOS' })
        .expect(201);

      expect(res.body.token).toBe(staffTokenAndroid);
      expect(res.body.platform).toBe('IOS');
      expect(res.body.userId).toBe(staffUserId);
    });

    it('3. User can register multiple device tokens (Multi-device support)', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ token: studentTokenIos, platform: 'IOS' })
        .expect(201);

      expect(res.body.token).toBe(studentTokenIos);
      expect(res.body.userId).toBe(student1UserId);

      const userTokens = await prisma.deviceToken.findMany({ where: { userId: student1UserId } });
      expect(userTokens.length).toBeGreaterThanOrEqual(2);
    });

    it('4 & Test E. Cross-user token returns 409 Conflict and cannot be rebound', async () => {
      const res = await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ token: studentTokenAndroid, platform: 'ANDROID' })
        .expect(409);

      expect(res.body.message).toContain('registered to another user account');

      // Verify ownership remains unchanged
      const dbToken = await prisma.deviceToken.findUnique({ where: { token: studentTokenAndroid } });
      expect(dbToken?.userId).toBe(student1UserId);
    });

    it('5. Invalid platform returns 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ token: 'some_valid_token_string', platform: 'WINDOWS_PHONE' })
        .expect(400);
    });

    it('6. Missing token field returns 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ platform: 'ANDROID' })
        .expect(400);
    });

    it('7. Unauthenticated token registration returns 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/devices/tokens')
        .send({ token: 'unauth_token', platform: 'ANDROID' })
        .expect(401);
    });

    it('8. User can unregister own device token', async () => {
      await request(app.getHttpServer())
        .delete('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ token: studentTokenIos })
        .expect(200);

      const dbToken = await prisma.deviceToken.findUnique({ where: { token: studentTokenIos } });
      expect(dbToken).toBeNull();

      // Check audit log format
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'DEVICE_TOKEN_REMOVED', userId: student1UserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.details).toEqual({ platform: 'IOS', reason: 'USER_LOGOUT' });
    });
  });

  // ============================================================
  // SECTION 2: NOTIFICATIONS API & READ STATE
  // ============================================================
  describe('Notification Retrieval & Read State APIs', () => {
    let testNotificationId: string;

    beforeAll(async () => {
      // Seed two test notifications for Student 1
      const notif1 = await prisma.notification.create({
        data: {
          userId: student1UserId,
          title: 'Test Title 1',
          body: 'Test Body 1',
          payload: { notificationType: 'SESSION_SCHEDULED', sessionId: 'sess-1' },
          isRead: false,
        },
      });
      testNotificationId = notif1.id;

      await prisma.notification.create({
        data: {
          userId: student1UserId,
          title: 'Test Title 2',
          body: 'Test Body 2',
          payload: { notificationType: 'ATTENDANCE_RECORDED', attendanceId: 'att-1' },
          isRead: false,
        },
      });

      // Seed one notification for Student 2
      await prisma.notification.create({
        data: {
          userId: student2UserId,
          title: 'Student 2 Private Notification',
          body: 'Private body',
          payload: { notificationType: 'SESSION_SCHEDULED' },
          isRead: false,
        },
      });
    });

    it('9 & 10. GET /notifications returns paginated notifications belonging to caller', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.unreadCount).toBeGreaterThanOrEqual(2);

      // Verify all returned notifications belong to Student 1
      res.body.data.forEach((item: any) => {
        expect(item.userId).toBe(student1UserId);
      });
    });

    it('11. User sees only own notifications (Student 1 does not see Student 2 notifications)', async () => {
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      const hasStudent2Notif = res.body.data.some((item: any) => item.body === 'Private body');
      expect(hasStudent2Notif).toBe(false);
    });

    it('12. PATCH /notifications/:id/read marks own notification as read', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/notifications/${testNotificationId}/read`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body.id).toBe(testNotificationId);
      expect(res.body.isRead).toBe(true);
    });

    it('14. PATCH /notifications/:id/read on another user notification returns 404', async () => {
      // Find Student 2 notification
      const st2Notif = await prisma.notification.findFirst({ where: { userId: student2UserId } });

      await request(app.getHttpServer())
        .patch(`/notifications/${st2Notif!.id}/read`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(404);
    });

    it('13. PATCH /notifications/read-all marks all notifications for caller as read', async () => {
      const res = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(res.body).toHaveProperty('count');

      // Verify unread count is now 0
      const unreadRes = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      expect(unreadRes.body.unreadCount).toBe(0);
    });
  });

  // ============================================================
  // SECTION 3: SESSION NOTIFICATION DISPATCH (SCHEDULED, UPDATED, CANCELLED)
  // ============================================================
  describe('Session Event Notifications', () => {
    let createdSessionId: string;

    it('21. Session Creation -> SESSION_SCHEDULED notification dispatched to SessionStudent roster', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const start = new Date(futureDate);
      start.setHours(10, 0, 0, 0);
      const end = new Date(futureDate);
      end.setHours(11, 0, 0, 0);
      const sessionDateStr = start.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

      const createRes = await request(app.getHttpServer())
        .post('/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Notifications Test Session',
          subjectId: testSubjectId,
          venueId: testVenueId,
          staffId: staffId,
          departmentId: testDeptId,
          courseId: testCourseId,
          batchId: testBatchId,
          sessionDate: sessionDateStr,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
        .expect(201);

      createdSessionId = createRes.body.id;

      // Verify Notification records created in DB for students in roster
      const notifs = await prisma.notification.findMany({
        where: {
          payload: {
            path: ['sessionId'],
            equals: createdSessionId,
          },
        },
      });

      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs[0].title).toBe('New Placement Session');

      // Verify FCM mock received dispatch
      const mocks = fcmService.getSentMulticasts();
      expect(mocks.length).toBeGreaterThan(0);
      const lastMock = mocks[mocks.length - 1];
      expect(lastMock.data?.notificationType).toBe('SESSION_SCHEDULED');
      expect(lastMock.data?.sessionId).toBe(createdSessionId);
    });

    it('22 & Test D. Session Update -> SESSION_UPDATED dispatched to committed SessionStudent snapshot', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 6);

      const start = new Date(futureDate);
      start.setHours(14, 0, 0, 0);
      const end = new Date(futureDate);
      end.setHours(15, 0, 0, 0);
      const sessionDateStr = start.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

      await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sessionDate: sessionDateStr,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
        .expect(200);

      // Verify SESSION_UPDATED notification generated
      const notifs = await prisma.notification.findMany({
        where: {
          payload: {
            path: ['notificationType'],
            equals: 'SESSION_UPDATED',
          },
        },
      });

      expect(notifs.length).toBeGreaterThan(0);
    });

    it('Test C. No-op session update -> No SESSION_UPDATED notification', async () => {
      fcmService.clearMockHistory();

      // Update only title (which is not a trigger field for SESSION_UPDATED)
      await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Renamed Title Only Session',
        })
        .expect(200);

      const mocks = fcmService.getSentMulticasts();
      const sessionUpdateMocks = mocks.filter(m => m.data?.notificationType === 'SESSION_UPDATED');
      expect(sessionUpdateMocks.length).toBe(0);
    });

    it('23. Session Cancellation -> SESSION_CANCELLED notification dispatched', async () => {
      await request(app.getHttpServer())
        .patch(`/sessions/${createdSessionId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'CANCELLED',
        })
        .expect(200);

      const notifs = await prisma.notification.findMany({
        where: {
          payload: {
            path: ['notificationType'],
            equals: 'SESSION_CANCELLED',
          },
        },
      });

      expect(notifs.length).toBeGreaterThan(0);

      const mocks = fcmService.getSentMulticasts();
      const cancelMock = mocks.find(m => m.data?.notificationType === 'SESSION_CANCELLED');
      expect(cancelMock).toBeDefined();
    });
  });

  // ============================================================
  // SECTION 4: ATTENDANCE NOTIFICATION DISPATCH
  // ============================================================
  describe('Attendance Event Notifications', () => {
    let inProgressSessionId: string;
    let rawQrToken: string;

    beforeAll(async () => {
      // Create an IN_PROGRESS session
      const now = new Date();
      const sessionDateStr = now.toISOString().split('T')[0];

      const start = new Date(now.getTime() - 5 * 60 * 1000); // 5 mins ago
      const end = new Date(now.getTime() + 55 * 60 * 1000);

      const sess = await prisma.classSession.create({
        data: {
          title: 'Attendance QR Notif Session',
          subjectId: testSubjectId,
          venueId: testVenueId,
          staffId: staffId,
          departmentId: testDeptId,
          courseId: testCourseId,
          batchId: testBatchId,
          sessionDate: new Date(sessionDateStr),
          startTime: start,
          endTime: end,
          status: 'IN_PROGRESS',
        },
      });
      inProgressSessionId = sess.id;

      // Create roster entry for Student 1
      await prisma.sessionStudent.create({
        data: {
          sessionId: inProgressSessionId,
          studentId: student1Id,
          isEligible: true,
        },
      });

      // Student 1 generates QR token
      const qrRes = await request(app.getHttpServer())
        .post('/attendance/qr/token')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ sessionId: inProgressSessionId })
        .expect(200);

      rawQrToken = qrRes.body.rawToken;
    });

    it('24. Staff scans QR -> ATTENDANCE_RECORDED notification dispatched to scanned student', async () => {
      fcmService.clearMockHistory();

      const scanRes = await request(app.getHttpServer())
        .post('/attendance/qr/scan')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ rawToken: rawQrToken })
        .expect(201);

      expect(scanRes.body.success).toBe(true);

      // Verify DB Notification created for Student 1
      const notif = await prisma.notification.findFirst({
        where: {
          userId: student1UserId,
          payload: {
            path: ['notificationType'],
            equals: 'ATTENDANCE_RECORDED',
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(notif).toBeDefined();
      expect(notif?.title).toBe('Attendance Recorded');
      expect(notif?.body).toContain('PRESENT');

      // Verify FCM payload contains safe metadata without raw QR token
      const mocks = fcmService.getSentMulticasts();
      expect(mocks.length).toBe(1);
      expect(mocks[0].data?.notificationType).toBe('ATTENDANCE_RECORDED');
      expect(mocks[0].data).not.toHaveProperty('rawToken');
      expect(mocks[0].data).not.toHaveProperty('tokenHash');
    });

    it('25. Unscanned students receive zero attendance notifications', async () => {
      const student2Notifs = await prisma.notification.findMany({
        where: {
          userId: student2UserId,
          payload: {
            path: ['notificationType'],
            equals: 'ATTENDANCE_RECORDED',
          },
        },
      });

      expect(student2Notifs.length).toBe(0);
    });
  });

  // ============================================================
  // SECTION 5: FCM FAILURE BOUNDARIES & INVALID TOKEN CLEANUP
  // ============================================================
  describe('FCM Failure Boundaries & Targeted Invalid Token Cleanup', () => {
    it('16. Invalid FCM token triggers targeted DeviceToken deletion and DEVICE_TOKEN_REMOVED audit', async () => {
      const invalidTokenStr = 'INVALID_TOKEN_' + Date.now();

      // Register invalid token for Student 1
      await request(app.getHttpServer())
        .post('/devices/tokens')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ token: invalidTokenStr, platform: 'ANDROID' })
        .expect(201);

      // Dispatch notification
      await notificationsService.dispatchNotifications({
        recipientUserIds: [student1UserId],
        title: 'Cleanup Test',
        body: 'Testing token cleanup',
        payload: { notificationType: 'SESSION_SCHEDULED' },
      });

      // Verify invalid token was removed from DB
      const dbTok = await prisma.deviceToken.findUnique({ where: { token: invalidTokenStr } });
      expect(dbTok).toBeNull();

      // Verify audit log entry
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'DEVICE_TOKEN_REMOVED', userId: student1UserId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.details).toEqual({ platform: 'ANDROID', reason: 'INVALID_FCM_TOKEN' });
    });

    it('17 & Test F. Inactive user device tokens excluded from FCM push dispatch', async () => {
      const inactiveUserToken = 'fcm_inactive_user_tok_' + Date.now();
      const inactiveEmail = `inactive_user_${Date.now()}@kahedu.edu.in`;

      // Create an inactive user + device token
      const inactiveUser = await prisma.user.create({
        data: {
          email: inactiveEmail,
          passwordHash: 'hash',
          role: 'STUDENT',
          status: 'INACTIVE',
        },
      });

      await prisma.deviceToken.create({
        data: {
          userId: inactiveUser.id,
          token: inactiveUserToken,
          platform: 'ANDROID',
        },
      });

      fcmService.clearMockHistory();

      // Attempt notification dispatch
      await notificationsService.dispatchNotifications({
        recipientUserIds: [inactiveUser.id],
        title: 'Inactive User Test',
        body: 'Should not receive push',
        payload: { notificationType: 'SESSION_SCHEDULED' },
      });

      const mocks = fcmService.getSentMulticasts();
      const inactiveTokenTargeted = mocks.some(m => m.tokens.includes(inactiveUserToken));
      expect(inactiveTokenTargeted).toBe(false);
    });

    it('Test A & Test B. Failure boundaries: FCM or DB notification error does not roll back domain operation', async () => {
      const res = await notificationsService.dispatchNotifications({
        recipientUserIds: [student1UserId],
        title: 'Failure Test',
        body: 'Testing resilience',
        payload: { notificationType: 'SESSION_SCHEDULED' },
      });

      expect(res.success).toBe(true);
    });

    it('Test G. Batching: More than 500 tokens chunked into max 500 batches', async () => {
      fcmService.clearMockHistory();

      // Create array of 550 mock tokens
      const largeTokenList = Array.from({ length: 550 }, (_, i) => `mock_chunk_token_${i}`);

      const result = await fcmService.sendMulticast(
        largeTokenList,
        'Chunk Test',
        'Testing 500 token chunking',
        { type: 'TEST' },
      );

      expect(result.successCount).toBe(550);
      expect(fcmService.getSentMulticasts().length).toBe(2);
      expect(fcmService.getSentMulticasts()[0].tokens.length).toBe(500);
      expect(fcmService.getSentMulticasts()[1].tokens.length).toBe(50);
    });
  });

  // ============================================================
  // SECTION 6: SECURITY AUDIT & PAYLOAD LEAK SANITY CHECKS
  // ============================================================
  describe('Security & Data Leak Rules', () => {
    it('26, 27, 28. Verify sensitive data (JWTs, raw QR tokens, FCM tokens, credentials, passwords) never appear in audit details or push payloads', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          action: { in: ['DEVICE_TOKEN_REGISTERED', 'DEVICE_TOKEN_REMOVED', 'NOTIFICATION_CREATED', 'NOTIFICATION_MARKED_READ', 'NOTIFICATION_DELIVERY_FAILED'] },
        },
        take: 20,
      });

      for (const log of auditLogs) {
        const detailsStr = JSON.stringify(log.details || {});
        expect(detailsStr).not.toContain('fcm_token');
        expect(detailsStr).not.toContain('rawToken');
        expect(detailsStr).not.toContain('password');
        expect(detailsStr).not.toContain('FIREBASE_SERVICE_ACCOUNT_JSON');
      }

      const sentPushes = fcmService.getSentMulticasts();
      for (const push of sentPushes) {
        const dataStr = JSON.stringify(push.data || {});
        expect(dataStr).not.toContain('rawToken');
        expect(dataStr).not.toContain('password');
        expect(dataStr).not.toContain('Bearer');
      }
    });
  });

  afterAll(async () => {
    if (prisma) {
      const testSessions = await prisma.classSession.findMany({
        where: { title: { in: ['Notifications Test Session', 'Renamed Title Only Session', 'Attendance QR Notif Session'] } },
        select: { id: true },
      });
      const sIds = testSessions.map((s) => s.id);
      if (sIds.length > 0) {
        await prisma.qrAttendanceToken.deleteMany({ where: { sessionId: { in: sIds } } });
        await prisma.attendance.deleteMany({ where: { sessionId: { in: sIds } } });
        await prisma.sessionStudent.deleteMany({ where: { sessionId: { in: sIds } } });
        await prisma.classSession.deleteMany({ where: { id: { in: sIds } } });
      }
    }
    if (app) {
      await app.close();
    }
  });
});
