import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QrTokenService {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async generateToken(sessionId: string, studentId: string) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 1000); // 60 seconds TTL

    // 1. Invalidate all previous unused tokens for this student & session
    await this.prisma.qrAttendanceToken.updateMany({
      where: {
        sessionId,
        studentId,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: now,
      },
    });

    // 2. Generate cryptographically random 32 bytes -> 64 character hex string
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    // 3. Store ONLY tokenHash in database
    await this.prisma.qrAttendanceToken.create({
      data: {
        sessionId,
        studentId,
        tokenHash,
        expiresAt,
        isUsed: false,
      },
    });

    return {
      rawToken,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: 60,
    };
  }
}
