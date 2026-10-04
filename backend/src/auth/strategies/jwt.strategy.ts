import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is missing');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId } = payload;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: {
          include: {
            department: true,
            course: true,
            placementBatch: true,
          },
        },
        staff: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }

    if (user.role === UserRole.STUDENT) {
      if (!user.student || user.student.status !== UserStatus.ACTIVE || !user.student.isPlacementEligible) {
        throw new ForbiddenException('Placement student account is not active or eligible');
      }
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
