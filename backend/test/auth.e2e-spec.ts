import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let studentToken: string;
  let staffToken: string;

  jest.setTimeout(30000);

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
  });

  describe('POST /auth/login', () => {
    it('should successfully authenticate eligible placement student with correct password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: '25cap109@kahedu.edu.in',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: '25cap109@kahedu.edu.in',
        role: 'STUDENT',
        status: 'ACTIVE',
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');

      studentToken = response.body.accessToken;
    });

    it('should successfully authenticate staff account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'staff001@kahedu.edu.in',
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('STAFF');

      staffToken = response.body.accessToken;
    });

    it('should reject login attempt with wrong password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: '25cap109@kahedu.edu.in',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should reject login for non-placement eligible student', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ineligible_student@kahedu.edu.in',
          password: 'password123',
        })
        .expect(403);

      expect(response.body.message).toContain('not active or eligible');
    });

    it('should reject request with invalid email DTO format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email-string',
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return student profile when valid JWT is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.email).toBe('25cap109@kahedu.edu.in');
      expect(response.body.student).toBeDefined();
      expect(response.body.student.registerNumber).toBe('25cap109');
      expect(response.body.student.isPlacementEligible).toBe(true);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject request without Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should reject request with malformed or invalid JWT', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });

  describe('PATCH /auth/profile (Profile Restrictions)', () => {
    it('should allow student to update permitted fields (phoneNumber, avatarUrl)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          phoneNumber: '+919999888877',
          avatarUrl: 'https://example.com/avatar-updated.jpg',
        })
        .expect(200);

      expect(response.body.phoneNumber).toBe('+919999888877');
      expect(response.body.avatarUrl).toBe('https://example.com/avatar-updated.jpg');
    });

    it('should reject attempt to modify academic identity fields via extra payload properties', async () => {
      await request(app.getHttpServer())
        .patch('/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          registerNumber: 'HACKED123',
        })
        .expect(400); // ValidationPipe forbidNonWhitelisted triggers 400
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully when current password is correct', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newStaffPassword456',
        })
        .expect(201);

      // Verify login with new password works
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'staff001@kahedu.edu.in',
          password: 'newStaffPassword456',
        })
        .expect(201);

      expect(loginRes.body.accessToken).toBeDefined();

      // Reset password back for repeatability
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({
          currentPassword: 'newStaffPassword456',
          newPassword: 'password123',
        })
        .expect(201);
    });

    it('should reject password change with incorrect current password', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPassword: 'wrongCurrentPassword',
          newPassword: 'newValidPassword123',
        })
        .expect(401);
    });

    it('should reject password change with short new password (< 8 chars)', async () => {
      await request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123',
        })
        .expect(400);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
