import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { QrTokenService } from './qr-token.service';
import { GenerateQrTokenDto } from './dto/generate-qr-token.dto';
import { ScanQrTokenDto } from './dto/scan-qr-token.dto';
import { AttendanceMethod, AttendanceStatus, SessionStatus, UserRole, UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly qrTokenService: QrTokenService,
  ) {}

  // ==========================================
  // 1. GENERATE QR TOKEN (STUDENT ONLY)
  // ==========================================

  async generateQrToken(dto: GenerateQrTokenDto, currentUser: any, ipAddress?: string) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only eligible placement students can generate attendance QR tokens');
    }

    if (currentUser.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Your account is not active');
    }

    const student = await this.prisma.student.findUnique({ where: { userId: currentUser.id } });
    if (!student || student.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Student profile is not active');
    }

    const session = await this.prisma.classSession.findUnique({ where: { id: dto.sessionId } });
    if (!session) {
      throw new NotFoundException(`Session with ID '${dto.sessionId}' not found`);
    }

    if (session.status !== SessionStatus.IN_PROGRESS) {
      throw new BadRequestException('Attendance QR generation is allowed only for IN_PROGRESS sessions');
    }

    // Check SessionStudent Roster Membership & Eligibility
    const sessionStudent = await this.prisma.sessionStudent.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: dto.sessionId,
          studentId: student.id,
        },
      },
    });

    if (!sessionStudent || !sessionStudent.isEligible) {
      throw new ForbiddenException('You are not enrolled or eligible for this placement session');
    }

    // Check Duplicate Attendance
    const existingAttendance = await this.prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: dto.sessionId,
          studentId: student.id,
        },
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Attendance has already been recorded for this session');
    }

    // Generate Token & Auto-Invalidate Previous Tokens
    const tokenResult = await this.qrTokenService.generateToken(dto.sessionId, student.id);

    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'ATTENDANCE_QR_GENERATED',
      entity: 'QrAttendanceToken',
      details: {
        sessionId: dto.sessionId,
        studentId: student.id,
        expiresAt: tokenResult.expiresAt,
      },
      ipAddress,
    });

    return tokenResult;
  }

  // ==========================================
  // 2. SCAN QR TOKEN & MARK ATTENDANCE
  // ==========================================

  async scanQrToken(dto: ScanQrTokenDto, currentUser: any, ipAddress?: string) {
    // Resolve active Staff profile for scanner
    const staff = await this.prisma.staff.findUnique({
      where: { userId: currentUser.id },
      include: { user: true },
    });

    if (!staff || staff.user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('QR scanning requires an active Staff profile associated with your user account');
    }

    const scannerStaffId = staff.id;
    const tokenHash = this.qrTokenService.hashToken(dto.rawToken);
    const now = new Date();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const token = await tx.qrAttendanceToken.findUnique({
          where: { tokenHash },
          include: {
            session: true,
            student: { include: { user: true } },
          },
        });

        if (!token) {
          throw new BadRequestException('Invalid or unrecognized QR token');
        }

        if (token.session.status !== SessionStatus.IN_PROGRESS) {
          throw new BadRequestException('Attendance can only be scanned for IN_PROGRESS sessions');
        }

        // STAFF authorization rule: STAFF can scan only for sessions they conduct
        if (currentUser.role === UserRole.STAFF && token.session.staffId !== scannerStaffId) {
          throw new ForbiddenException('STAFF can only scan QR tokens for sessions they conduct');
        }

        if (token.isUsed || token.expiresAt < now) {
          throw new BadRequestException('QR token has expired or has already been used');
        }

        // Student active check
        if (token.student.status !== UserStatus.ACTIVE || token.student.user.status !== UserStatus.ACTIVE) {
          throw new ForbiddenException('Student account is not active');
        }

        // Roster membership check
        const rosterEntry = await tx.sessionStudent.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: token.sessionId,
              studentId: token.studentId,
            },
          },
        });

        if (!rosterEntry || !rosterEntry.isEligible) {
          throw new ForbiddenException('Student is not enrolled or eligible in session roster');
        }

        // Atomic Conditional Token Consumption
        const consumeResult = await tx.qrAttendanceToken.updateMany({
          where: {
            id: token.id,
            isUsed: false,
            expiresAt: { gt: now },
          },
          data: {
            isUsed: true,
            usedAt: now,
          },
        });

        if (consumeResult.count === 0) {
          throw new BadRequestException('QR token has already been used or has expired');
        }

        // PRESENT vs LATE Status Calculation
        const startTime = new Date(token.session.startTime);
        const fifteenMinutesMs = 15 * 60 * 1000;
        const attendanceStatus =
          now.getTime() <= startTime.getTime() + fifteenMinutesMs
            ? AttendanceStatus.PRESENT
            : AttendanceStatus.LATE;

        // Create Attendance record (Hard unique constraint @@unique([sessionId, studentId]))
        try {
          const attendance = await tx.attendance.create({
            data: {
              sessionId: token.sessionId,
              studentId: token.studentId,
              markedByStaffId: scannerStaffId,
              method: AttendanceMethod.QR,
              status: attendanceStatus,
              markedAt: now,
            },
            include: {
              student: { select: { id: true, registerNumber: true, firstName: true, lastName: true, collegeEmail: true } },
              session: { select: { id: true, title: true, status: true } },
            },
          });

          return attendance;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            throw new ConflictException('Attendance has already been recorded for this student in this session');
          }
          throw err;
        }
      });

      await this.auditLogService.log({
        userId: currentUser.id,
        action: 'ATTENDANCE_RECORDED',
        entity: 'Attendance',
        entityId: result.id,
        details: {
          sessionId: result.sessionId,
          studentId: result.studentId,
          markedByStaffId: scannerStaffId,
          method: 'QR',
          status: result.status,
        },
        ipAddress,
      });

      return {
        success: true,
        attendance: result,
      };
    } catch (error) {
      await this.auditLogService.log({
        userId: currentUser.id,
        action: 'ATTENDANCE_SCAN_FAILED',
        entity: 'Attendance',
        details: {
          reason: error instanceof Error ? error.message : String(error),
          scannerStaffId,
        },
        ipAddress,
      });
      throw error;
    }
  }

  // ==========================================
  // 3. GET SESSION ATTENDANCE LIST & SUMMARY
  // ==========================================

  async getSessionAttendance(sessionId: string, currentUser: any) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
      include: {
        subject: true,
        venue: true,
        staff: true,
        department: true,
        course: true,
        batch: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID '${sessionId}' not found`);
    }

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.prisma.staff.findUnique({ where: { userId: currentUser.id } });
      if (!staff || session.staffId !== staff.id) {
        throw new ForbiddenException('STAFF can only view attendance for sessions they conduct');
      }
    }

    const [roster, attendances] = await Promise.all([
      this.prisma.sessionStudent.findMany({
        where: { sessionId, isEligible: true },
        include: {
          student: {
            select: {
              id: true,
              registerNumber: true,
              firstName: true,
              lastName: true,
              collegeEmail: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: { student: { registerNumber: 'asc' } },
      }),
      this.prisma.attendance.findMany({
        where: { sessionId },
      }),
    ]);

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    let presentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const rosterList = roster.map((item) => {
      const att = attendanceMap.get(item.studentId);
      let statusStr = 'ABSENT';
      if (att) {
        statusStr = att.status;
        if (att.status === AttendanceStatus.PRESENT) presentCount++;
        else if (att.status === AttendanceStatus.LATE) lateCount++;
        else if (att.status === AttendanceStatus.EXCUSED) excusedCount++;
      }

      return {
        studentId: item.student.id,
        registerNumber: item.student.registerNumber,
        firstName: item.student.firstName,
        lastName: item.student.lastName,
        collegeEmail: item.student.collegeEmail,
        phoneNumber: item.student.phoneNumber,
        attendanceStatus: statusStr,
        markedAt: att ? att.markedAt : null,
        method: att ? att.method : null,
      };
    });

    const totalRoster = roster.length;
    const absentCount = totalRoster - (presentCount + lateCount + excusedCount);

    return {
      session,
      summary: {
        totalRoster,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
      },
      roster: rosterList,
    };
  }

  // ==========================================
  // 4. GET MY ATTENDANCE HISTORY (STUDENT ONLY)
  // ==========================================

  async getMyAttendance(currentUser: any) {
    if (currentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only students can view their attendance history');
    }

    const student = await this.prisma.student.findUnique({ where: { userId: currentUser.id } });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const records = await this.prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { markedAt: 'desc' },
      include: {
        session: {
          include: {
            subject: true,
            venue: true,
            staff: true,
          },
        },
      },
    });

    return records.map((r) => ({
      id: r.id,
      sessionId: r.sessionId,
      sessionTitle: r.session.title,
      subjectCode: r.session.subject.code,
      subjectTitle: r.session.subject.title,
      venueName: r.session.venue.name,
      conductingStaffName: `${r.session.staff.firstName} ${r.session.staff.lastName || ''}`.trim(),
      attendanceStatus: r.status,
      method: r.method,
      markedAt: r.markedAt,
    }));
  }
}
