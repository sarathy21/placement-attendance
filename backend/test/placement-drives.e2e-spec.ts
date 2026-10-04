import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Placement Drives & Calendar (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let staffToken: string;
  let staff2Token: string;
  let studentToken: string;

  let staffUserId: string;
  let staffId: string;
  let staff2UserId: string;
  let staff2Id: string;
  let studentUserId: string;

  let testDriveId: string;
  let testRoundId: string;
  let staff1SessionIdA: string;
  let staff1SessionIdC: string;
  let staff2SessionId: string;
  let staff2SessionIdF: string;
  let staff2SessionIdG: string;

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

      // 1. Login SuperAdmin, Admin, Staff 1, Student
      const saRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'superadmin@kahedu.edu.in', password: 'password123' });
      superAdminToken = saRes.body.accessToken;

      const adminRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@kahedu.edu.in', password: 'password123' });
      adminToken = adminRes.body.accessToken;

      const staffRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'staff001@kahedu.edu.in', password: 'password123' });
      staffToken = staffRes.body.accessToken;
      staffUserId = staffRes.body.user.id;

      const staffProfile = await prisma.staff.findUnique({ where: { userId: staffUserId } });
      staffId = staffProfile!.id;

      const stRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: '25cap109@kahedu.edu.in', password: 'password123' });
      studentToken = stRes.body.accessToken;
      studentUserId = stRes.body.user.id;

      // 2. Ensure Staff 2 exists in DB for non-owner authorization tests
      let st2User = await prisma.user.findUnique({ where: { email: 'staff002@kahedu.edu.in' } });
      if (!st2User) {
        const hash = await argon2.hash('password123');
        st2User = await prisma.user.create({
          data: {
            email: 'staff002@kahedu.edu.in',
            passwordHash: hash,
            role: 'STAFF',
            status: 'ACTIVE',
          },
        });
      }
      staff2UserId = st2User.id;

      let st2Prof = await prisma.staff.findUnique({ where: { userId: st2User.id } });
      if (!st2Prof) {
        st2Prof = await prisma.staff.create({
          data: {
            userId: st2User.id,
            staffId: 'STAFF002',
            firstName: 'Second',
            lastName: 'Staff',
          },
        });
      }
      staff2Id = st2Prof.id;

      const st2Res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'staff002@kahedu.edu.in', password: 'password123' });
      staff2Token = st2Res.body.accessToken;

      // 3. Create test ClassSessions for staff1 and staff2 session ownership authorization tests
      const subject = await prisma.subject.findFirst();
      const venue = await prisma.venue.findFirst();
      const dept = await prisma.department.findFirst();

      const s1A = await prisma.classSession.create({
        data: {
          title: 'Staff 1 Session A',
          subjectId: subject!.id,
          venueId: venue!.id,
          departmentId: dept!.id,
          staffId: staffId,
          sessionDate: new Date('2026-11-10'),
          startTime: new Date('2026-11-10T10:00:00Z'),
          endTime: new Date('2026-11-10T11:00:00Z'),
          status: 'SCHEDULED',
        },
      });
      staff1SessionIdA = s1A.id;

      const s1C = await prisma.classSession.create({
        data: {
          title: 'Staff 1 Session C',
          subjectId: subject!.id,
          venueId: venue!.id,
          departmentId: dept!.id,
          staffId: staffId,
          sessionDate: new Date('2026-11-12'),
          startTime: new Date('2026-11-12T10:00:00Z'),
          endTime: new Date('2026-11-12T11:00:00Z'),
          status: 'SCHEDULED',
        },
      });
      staff1SessionIdC = s1C.id;

      const s2 = await prisma.classSession.create({
        data: {
          title: 'Staff 2 Conducted Session',
          subjectId: subject!.id,
          venueId: venue!.id,
          departmentId: dept!.id,
          staffId: staff2Id,
          sessionDate: new Date('2026-11-11'),
          startTime: new Date('2026-11-11T10:00:00Z'),
          endTime: new Date('2026-11-11T11:00:00Z'),
          status: 'SCHEDULED',
        },
      });
      staff2SessionId = s2.id;

      const s2F = await prisma.classSession.create({
        data: {
          title: 'Staff 2 Session F',
          subjectId: subject!.id,
          venueId: venue!.id,
          departmentId: dept!.id,
          staffId: staff2Id,
          sessionDate: new Date('2026-11-13'),
          startTime: new Date('2026-11-13T10:00:00Z'),
          endTime: new Date('2026-11-13T11:00:00Z'),
          status: 'SCHEDULED',
        },
      });
      staff2SessionIdF = s2F.id;

      const s2G = await prisma.classSession.create({
        data: {
          title: 'Staff 2 Session G',
          subjectId: subject!.id,
          venueId: venue!.id,
          departmentId: dept!.id,
          staffId: staff2Id,
          sessionDate: new Date('2026-11-14'),
          startTime: new Date('2026-11-14T10:00:00Z'),
          endTime: new Date('2026-11-14T11:00:00Z'),
          status: 'SCHEDULED',
        },
      });
      staff2SessionIdG = s2G.id;

      // Cleanup any test drives from previous runs
      const oldDrives = await prisma.placementDrive.findMany({
        where: { companyName: { in: ['Test TCS Drive', 'Test Infosys Drive', 'Test Wipro Drive'] } },
        select: { id: true },
      });
      const oldIds = oldDrives.map(d => d.id);
      if (oldIds.length > 0) {
        await prisma.placementDriveRound.deleteMany({ where: { driveId: { in: oldIds } } });
        await prisma.placementDrive.deleteMany({ where: { id: { in: oldIds } } });
      }
    } catch (err) {
      console.error('BEFORE ALL FAILED:', err);
      throw err;
    }
  });

  describe('Placement Drive Creation & Permissions', () => {
    it('1 & 6. Staff can create Placement Drive with attendance OFF by default', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          companyName: 'Test TCS Drive',
          driveDate: '2026-10-20',
          venue: 'Campus Placement Hall',
          description: 'TCS All India Campus Drive',
        })
        .expect(201);

      expect(res.body.companyName).toBe('Test TCS Drive');
      expect(res.body.attendanceEnabled).toBe(false); // OFF by default
      expect(res.body.status).toBe('UPCOMING');
      expect(res.body.createdById).toBe(staffId);

      testDriveId = res.body.id;

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'PLACEMENT_DRIVE_CREATED', entityId: testDriveId },
      });
      expect(audit).toBeDefined();
    });

    it('7. Staff can create Placement Drive with attendance ON explicitly', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          companyName: 'Test Infosys Drive',
          driveDate: '2026-10-25',
          venue: 'Tech Auditorium',
          attendanceEnabled: true,
        })
        .expect(201);

      expect(res.body.companyName).toBe('Test Infosys Drive');
      expect(res.body.attendanceEnabled).toBe(true);
    });

    it('3. Student cannot create Placement Drive (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          companyName: 'Illegal Drive',
          driveDate: '2026-10-30',
          venue: 'Hall A',
        })
        .expect(403);
    });

    it('2. Inactive staff account cannot create Placement Drive (403 Forbidden)', async () => {
      const inactiveEmail = `inactive_staff_${Date.now()}@kahedu.edu.in`;
      const hash = await argon2.hash('password123');

      const inactUser = await prisma.user.create({
        data: {
          email: inactiveEmail,
          passwordHash: hash,
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });

      await prisma.staff.create({
        data: {
          userId: inactUser.id,
          staffId: `INACT_${Date.now()}`,
          firstName: 'Inactive',
          lastName: 'Staff',
        },
      });

      const inactLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: inactiveEmail, password: 'password123' });

      await prisma.user.update({
        where: { id: inactUser.id },
        data: { status: 'INACTIVE' },
      });

      await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${inactLogin.body.accessToken}`)
        .send({
          companyName: 'Inactive Staff Drive',
          driveDate: '2026-11-01',
          venue: 'Hall B',
        })
        .expect(403);
    });
  });

  describe('Drive Visibility & Student Read-Only Controls', () => {
    it('4. Student can view visible Placement Drives', async () => {
      const res = await request(app.getHttpServer())
        .get('/placement-drives')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('5. Student cannot modify Placement Drive details or status (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/placement-drives/${testDriveId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ companyName: 'Hacked Company Name' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/placement-drives/${testDriveId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'CANCELLED' })
        .expect(403);
    });
  });

  describe('Drive Rounds & Round Ordering', () => {
    it('9 & 10. Staff can add multiple ordered rounds to a Placement Drive', async () => {
      const r1Res = await request(app.getHttpServer())
        .post(`/placement-drives/${testDriveId}/rounds`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          roundName: 'Round 1: Aptitude Test',
          roundOrder: 1,
          venue: 'Online Lab 1',
        })
        .expect(201);

      expect(r1Res.body.roundName).toBe('Round 1: Aptitude Test');
      expect(r1Res.body.roundOrder).toBe(1);
      testRoundId = r1Res.body.id;

      const r2Res = await request(app.getHttpServer())
        .post(`/placement-drives/${testDriveId}/rounds`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          roundName: 'Round 2: Technical Interview',
          roundOrder: 2,
          venue: 'Interview Cabin 4',
        })
        .expect(201);

      expect(r2Res.body.roundOrder).toBe(2);

      // Fetch drive detail and verify round ordering
      const detailRes = await request(app.getHttpServer())
        .get(`/placement-drives/${testDriveId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(detailRes.body.rounds.length).toBe(2);
      expect(detailRes.body.rounds[0].roundOrder).toBe(1);
      expect(detailRes.body.rounds[1].roundOrder).toBe(2);
    });

    it('13. Non-owner staff cannot modify or delete rounds belonging to another staff drive (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/placement-drives/${testDriveId}/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .send({ roundName: 'Unauthorized Update' })
        .expect(403);

      await request(app.getHttpServer())
        .delete(`/placement-drives/${testDriveId}/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${staff2Token}`)
        .expect(403);
    });

    it('11. Owner staff can update round details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/placement-drives/${testDriveId}/rounds/${testRoundId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ venue: 'Updated Online Lab 2' })
        .expect(200);

      expect(res.body.venue).toBe('Updated Online Lab 2');
    });
  });

  describe('Drive Lifecycle & Cancellation', () => {
    it('12. Owner staff can transition drive status to CANCELLED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/placement-drives/${testDriveId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'PLACEMENT_DRIVE_CANCELLED', entityId: testDriveId },
      });
      expect(audit).toBeDefined();
    });
  });

  describe('Placement Drive Session Ownership Authorization', () => {
    let authDriveId: string;
    let authRoundId: string;

    it('A. STAFF A creates drive and links STAFF A\'s own ClassSession -> SUCCESS', async () => {
      const res = await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          companyName: 'Test Wipro Drive',
          driveDate: '2026-11-05',
          venue: 'Main Auditorium',
          attendanceEnabled: true,
          rounds: [
            {
              roundName: 'Round 1: Screening',
              roundOrder: 1,
              sessionId: staff1SessionIdA,
            },
          ],
        })
        .expect(201);

      expect(res.body.rounds[0].sessionId).toBe(staff1SessionIdA);
      authDriveId = res.body.id;
      authRoundId = res.body.rounds[0].id;
    });

    it('B. STAFF A creates drive and attempts to link STAFF B\'s ClassSession -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post('/placement-drives')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          companyName: 'Unauthorized Session Drive',
          driveDate: '2026-11-06',
          venue: 'Hall C',
          rounds: [
            {
              roundName: 'Illegal Round',
              roundOrder: 1,
              sessionId: staff2SessionId,
            },
          ],
        })
        .expect(403);
    });

    it('C. STAFF A adds a round using STAFF A\'s own ClassSession -> SUCCESS', async () => {
      const res = await request(app.getHttpServer())
        .post(`/placement-drives/${authDriveId}/rounds`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          roundName: 'Round 2: Technical',
          roundOrder: 2,
          sessionId: staff1SessionIdC,
        })
        .expect(201);

      expect(res.body.sessionId).toBe(staff1SessionIdC);
    });

    it('D. STAFF A adds a round using STAFF B\'s ClassSession -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .post(`/placement-drives/${authDriveId}/rounds`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          roundName: 'Illegal Round 3',
          roundOrder: 3,
          sessionId: staff2SessionId,
        })
        .expect(403);
    });

    it('E. STAFF A updates a round to STAFF B\'s ClassSession -> 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .patch(`/placement-drives/${authDriveId}/rounds/${authRoundId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          sessionId: staff2SessionId,
        })
        .expect(403);
    });

    it('F. ADMIN can link/manage an authorized session according to existing admin rules', async () => {
      const res = await request(app.getHttpServer())
        .post(`/placement-drives/${authDriveId}/rounds`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roundName: 'Admin Managed Round',
          roundOrder: 4,
          sessionId: staff2SessionIdF,
        })
        .expect(201);

      expect(res.body.sessionId).toBe(staff2SessionIdF);
    });

    it('G. SUPER_ADMIN can link/manage an authorized session according to existing super-admin rules', async () => {
      const res = await request(app.getHttpServer())
        .post(`/placement-drives/${authDriveId}/rounds`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          roundName: 'SuperAdmin Managed Round',
          roundOrder: 5,
          sessionId: staff2SessionIdG,
        })
        .expect(201);

      expect(res.body.sessionId).toBe(staff2SessionIdG);
    });
  });

  afterAll(async () => {
    if (prisma) {
      const testDrives = await prisma.placementDrive.findMany({
        where: { companyName: { in: ['Test TCS Drive', 'Test Infosys Drive', 'Test Wipro Drive', 'Unauthorized Session Drive'] } },
        select: { id: true },
      });
      const ids = testDrives.map(d => d.id);
      if (ids.length > 0) {
        await prisma.placementDriveRound.deleteMany({ where: { driveId: { in: ids } } });
        await prisma.placementDrive.deleteMany({ where: { id: { in: ids } } });
      }

      const createdSessionIds = [staff1SessionIdA, staff1SessionIdC, staff2SessionId, staff2SessionIdF, staff2SessionIdG].filter(Boolean);
      if (createdSessionIds.length > 0) {
        await prisma.classSession.deleteMany({
          where: { id: { in: createdSessionIds } },
        });
      }
    }
    if (app) {
      await app.close();
    }
  });
});
