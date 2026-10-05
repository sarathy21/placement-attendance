import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { GetSessionsFilterDto } from './dto/get-sessions-filter.dto';
import { GetMySessionsFilterDto } from './dto/get-my-sessions-filter.dto';
import { SessionStatus, UserRole, UserStatus, Prisma } from '@prisma/client';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // HELPER: Time & Date Validation (Asia/Kolkata)
  // ==========================================

  private validateTimeAndDate(sessionDateStr: string, startTimeStr: string, endTimeStr: string) {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startTime or endTime ISO timestamp');
    }

    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('startTime must be strictly earlier than endTime');
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      throw new BadRequestException('Session duration must be at least 15 minutes');
    }

    // Extract calendar date in Asia/Kolkata (YYYY-MM-DD)
    const startDateInKolkata = start.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });
    const inputDate = new Date(sessionDateStr);
    if (isNaN(inputDate.getTime())) {
      throw new BadRequestException('Invalid sessionDate format');
    }
    const inputDateInKolkata = inputDate.toLocaleDateString('sv', { timeZone: 'Asia/Kolkata' });

    if (startDateInKolkata !== inputDateInKolkata) {
      throw new BadRequestException(
        `sessionDate '${inputDateInKolkata}' does not match the local calendar date of startTime ('${startDateInKolkata}' in Asia/Kolkata timezone)`,
      );
    }

    return { start, end, sessionDateObj: new Date(startDateInKolkata) };
  }

  // ==========================================
  // HELPER: Overlap Prevention (Venue & Staff)
  // ==========================================

  private async checkOverlaps(
    venueId: string,
    staffId: string,
    start: Date,
    end: Date,
    excludeSessionId?: string,
  ) {
    const activeStatuses: SessionStatus[] = [SessionStatus.SCHEDULED, SessionStatus.IN_PROGRESS];

    // Venue overlap check
    const venueConflict = await this.prisma.classSession.findFirst({
      where: {
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        venueId,
        status: { in: activeStatuses },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { venue: true },
    });

    if (venueConflict) {
      throw new BadRequestException(
        `Venue '${venueConflict.venue.name}' is already booked for session '${venueConflict.title}' during this time period`,
      );
    }

    // Staff overlap check
    const staffConflict = await this.prisma.classSession.findFirst({
      where: {
        id: excludeSessionId ? { not: excludeSessionId } : undefined,
        staffId,
        status: { in: activeStatuses },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { staff: true },
    });

    if (staffConflict) {
      throw new BadRequestException(
        `Staff member '${staffConflict.staff.firstName}' is already assigned to session '${staffConflict.title}' during this time period`,
      );
    }
  }

  // ==========================================
  // HELPER: Target Scope Verification
  // ==========================================

  private async validateTargetScope(departmentId?: string, courseId?: string, placementBatchId?: string) {
    if (departmentId && courseId) {
      const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        throw new BadRequestException(`Department with ID '${departmentId}' does not exist`);
      }
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new BadRequestException(`Course with ID '${courseId}' does not exist`);
      }
      if (course.departmentId !== departmentId) {
        throw new BadRequestException(
          `Course '${course.code}' does not belong to Department '${dept.code}'`,
        );
      }
    } else if (courseId) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (!course) {
        throw new BadRequestException(`Course with ID '${courseId}' does not exist`);
      }
    } else if (departmentId) {
      const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!dept) {
        throw new BadRequestException(`Department with ID '${departmentId}' does not exist`);
      }
    }

    if (placementBatchId) {
      const pb = await this.prisma.placementBatch.findUnique({ where: { id: placementBatchId } });
      if (!pb) {
        throw new BadRequestException(`Placement batch with ID '${placementBatchId}' does not exist`);
      }
    }
  }

  // ==========================================
  // CREATE SESSION & ROSTER MATERIALIZATION
  // ==========================================

  async create(dto: CreateSessionDto, currentUser: any, ipAddress?: string) {
    // 1. Validate Time & Date (Asia/Kolkata)
    const { start, end, sessionDateObj } = this.validateTimeAndDate(
      dto.sessionDate,
      dto.startTime,
      dto.endTime,
    );

    // 2. Resource & Conduct Staff Authorization
    let conductingStaffId: string;

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.prisma.staff.findUnique({
        where: { userId: currentUser.id },
        include: { user: true },
      });
      if (!staff || staff.user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Staff account is not active or found');
      }
      conductingStaffId = staff.id;
    } else {
      if (!dto.staffId) {
        throw new BadRequestException('staffId is required when session is created by Admin');
      }
      const staff = await this.prisma.staff.findUnique({
        where: { id: dto.staffId },
        include: { user: true },
      });
      if (!staff || staff.user.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Selected conducting staff member is not active or found');
      }
      conductingStaffId = staff.id;
    }

    // 3. Reference Data Verification (Subject & Venue)
    const [subject, venue] = await Promise.all([
      dto.subjectId ? this.prisma.subject.findUnique({ where: { id: dto.subjectId } }) : Promise.resolve(null),
      this.prisma.venue.findUnique({ where: { id: dto.venueId } }),
    ]);

    if (dto.subjectId && !subject) {
      throw new BadRequestException(`Subject with ID '${dto.subjectId}' not found`);
    }
    if (!venue) {
      throw new BadRequestException(`Venue with ID '${dto.venueId}' not found`);
    }

    // 4. Target Scope Verification
    await this.validateTargetScope(dto.departmentId, dto.courseId, dto.placementBatchId);

    // 5. Overlap Prevention (Venue & Staff)
    await this.checkOverlaps(dto.venueId, conductingStaffId, start, end);

    // 6. Query Eligible Placement Students Roster
    const targetStudents = await this.prisma.student.findMany({
      where: {
        status: UserStatus.ACTIVE,
        isPlacementEligible: true,
        user: { status: UserStatus.ACTIVE },
        ...(dto.departmentId && { departmentId: dto.departmentId }),
        ...(dto.courseId && { courseId: dto.courseId }),
        ...(dto.placementBatchId && { placementBatchId: dto.placementBatchId }),
      },
      select: { id: true, userId: true },
    });

    // 7. Atomic Transactional Session & Roster Creation
    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.classSession.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          subjectId: dto.subjectId ?? null,
          venueId: dto.venueId,
          staffId: conductingStaffId,
          departmentId: dto.departmentId || null,
          courseId: dto.courseId || null,
          placementBatchId: dto.placementBatchId || null,
          sessionDate: sessionDateObj,
          startTime: start,
          endTime: end,
          status: SessionStatus.SCHEDULED,
        },
        include: {
          subject: true,
          venue: true,
          staff: true,
          department: true,
          course: true,
          placementBatch: true,
        },
      });

      if (targetStudents.length > 0) {
        await tx.sessionStudent.createMany({
          data: targetStudents.map((s) => ({
            sessionId: session.id,
            studentId: s.id,
            isEligible: true,
          })),
        });
      }

      return { session, rosterCount: targetStudents.length };
    });

    // 8. Audit Log
    await this.auditLogService.log({
      userId: currentUser.id,
      action: 'SESSION_CREATED',
      entity: 'ClassSession',
      entityId: result.session.id,
      details: {
        title: result.session.title,
        rosterCount: result.rosterCount,
        staffId: conductingStaffId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        placementBatchId: dto.placementBatchId,
      },
      ipAddress,
    });

    // 9. Post-Commit Notification Processing
    const recipientUserIds = targetStudents.map((s) => s.userId);
    if (recipientUserIds.length > 0) {
      await this.notificationsService.dispatchNotifications({
        recipientUserIds,
        title: 'New Placement Session',
        body: 'A new placement session has been scheduled.',
        payload: {
          notificationType: NotificationType.SESSION_SCHEDULED,
          relatedEntityId: result.session.id,
          sessionId: result.session.id,
        },
      });
    }

    return {
      ...result.session,
      rosterCount: result.rosterCount,
    };
  }

  // ==========================================
  // FIND ALL SESSIONS
  // ==========================================

  async findAll(filter: GetSessionsFilterDto) {
    const {
      subjectId,
      venueId,
      staffId,
      departmentId,
      courseId,
      placementBatchId,
      status,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ClassSessionWhereInput = {};

    if (subjectId) where.subjectId = subjectId;
    if (venueId) where.venueId = venueId;
    if (staffId) where.staffId = staffId;
    if (departmentId) where.departmentId = departmentId;
    if (courseId) where.courseId = courseId;
    if (placementBatchId) where.placementBatchId = placementBatchId;
    if (status) where.status = status;

    if (fromDate || toDate) {
      where.startTime = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    if (search) {
      where.title = { contains: search.trim(), mode: 'insensitive' };
    }

    const [total, sessions] = await Promise.all([
      this.prisma.classSession.count({ where }),
      this.prisma.classSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          subject: true,
          venue: true,
          staff: true,
          department: true,
          course: true,
          placementBatch: true,
          _count: { select: { sessionStudents: true, attendances: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // ==========================================
  // FIND MY SESSIONS (STUDENT or STAFF)
  // ==========================================

  async findMySessions(filter: GetMySessionsFilterDto, currentUser: any) {
    const { status, fromDate, toDate, page = 1, limit = 20 } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ClassSessionWhereInput = {};

    if (status) where.status = status;

    if (fromDate || toDate) {
      where.startTime = {
        ...(fromDate && { gte: new Date(fromDate) }),
        ...(toDate && { lte: new Date(toDate) }),
      };
    }

    if (currentUser.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { userId: currentUser.id } });
      if (!student) throw new NotFoundException('Student profile not found');

      where.sessionStudents = {
        some: { studentId: student.id, isEligible: true },
      };
    } else if (currentUser.role === UserRole.STAFF) {
      const staff = await this.prisma.staff.findUnique({ where: { userId: currentUser.id } });
      if (!staff) throw new NotFoundException('Staff profile not found');

      where.staffId = staff.id;
    }

    const [total, sessions] = await Promise.all([
      this.prisma.classSession.count({ where }),
      this.prisma.classSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          subject: true,
          venue: true,
          staff: true,
          department: true,
          course: true,
          placementBatch: true,
          _count: { select: { sessionStudents: true, attendances: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: sessions,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // ==========================================
  // FIND ONE SESSION BY ID
  // ==========================================

  async findOne(id: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        subject: true,
        venue: true,
        staff: true,
        department: true,
        course: true,
        placementBatch: true,
        sessionStudents: {
          include: {
            student: {
              include: { department: true, course: true, placementBatch: true },
            },
          },
        },
        _count: { select: { sessionStudents: true, attendances: true } },
      },
    });

    if (!session) {
      throw new NotFoundException(`ClassSession with ID '${id}' not found`);
    }

    return session;
  }

  // ==========================================
  // UPDATE SESSION
  // ==========================================

  async update(id: string, dto: UpdateSessionDto, currentUser: any, ipAddress?: string) {
    const session = await this.findOne(id);

    // Resource Authorization Check for STAFF
    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.prisma.staff.findUnique({ where: { userId: currentUser.id } });
      if (!staff || session.staffId !== staff.id) {
        throw new ForbiddenException('STAFF can only update sessions they conduct');
      }
      if (dto.staffId && dto.staffId !== staff.id) {
        throw new ForbiddenException('STAFF cannot reassign session to another staff member');
      }
    }

    // Freeze Checks
    if (session.status !== SessionStatus.SCHEDULED) {
      throw new BadRequestException(
        `Session details and roster are frozen because session status is '${session.status}'`,
      );
    }

    const attendanceCount = await this.prisma.attendance.count({ where: { sessionId: id } });
    if (attendanceCount > 0) {
      throw new BadRequestException('Session targeting and roster are frozen because attendance has been recorded');
    }

    const targetDeptId = dto.departmentId !== undefined ? dto.departmentId : session.departmentId;
    const targetCourseId = dto.courseId !== undefined ? dto.courseId : session.courseId;
    const targetPbId = dto.placementBatchId !== undefined ? dto.placementBatchId : session.placementBatchId;

    await this.validateTargetScope(targetDeptId || undefined, targetCourseId || undefined, targetPbId || undefined);

    let conductingStaffId = session.staffId;
    if (dto.staffId && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPER_ADMIN)) {
      const staff = await this.prisma.staff.findUnique({
        where: { id: dto.staffId },
        include: { user: true },
      });
      if (!staff || staff.user.status !== UserStatus.ACTIVE) {
        throw new BadRequestException('Selected staff member is not active or found');
      }
      conductingStaffId = staff.id;
    }

    const targetSubjectId = dto.subjectId || session.subjectId;
    const targetVenueId = dto.venueId || session.venueId;

    const startTimeStr = dto.startTime || session.startTime.toISOString();
    const endTimeStr = dto.endTime || session.endTime.toISOString();
    const sessionDateStr = dto.sessionDate || session.sessionDate.toISOString();

    const { start, end, sessionDateObj } = this.validateTimeAndDate(sessionDateStr, startTimeStr, endTimeStr);

    // Overlap Prevention Check
    await this.checkOverlaps(targetVenueId, conductingStaffId, start, end, id);

    // Check trigger fields for SESSION_UPDATED
    const isSessionDateChanged =
      dto.sessionDate !== undefined &&
      new Date(dto.sessionDate).toISOString().split('T')[0] !==
        new Date(session.sessionDate).toISOString().split('T')[0];
    const isStartTimeChanged =
      dto.startTime !== undefined && new Date(dto.startTime).getTime() !== session.startTime.getTime();
    const isEndTimeChanged =
      dto.endTime !== undefined && new Date(dto.endTime).getTime() !== session.endTime.getTime();
    const isVenueChanged = dto.venueId !== undefined && dto.venueId !== session.venueId;
    const isStaffChanged = dto.staffId !== undefined && dto.staffId !== session.staffId;
    const isSubjectChanged = dto.subjectId !== undefined && dto.subjectId !== session.subjectId;
    const isDeptChanged = dto.departmentId !== undefined && dto.departmentId !== session.departmentId;
    const isCourseChanged = dto.courseId !== undefined && dto.courseId !== session.courseId;
    const isPbChanged = dto.placementBatchId !== undefined && dto.placementBatchId !== session.placementBatchId;

    const hasTriggerFieldChanged =
      isSessionDateChanged ||
      isStartTimeChanged ||
      isEndTimeChanged ||
      isVenueChanged ||
      isStaffChanged ||
      isSubjectChanged ||
      isDeptChanged ||
      isCourseChanged ||
      isPbChanged;

    const isScopeChanged =
      targetDeptId !== session.departmentId ||
      targetCourseId !== session.courseId ||
      targetPbId !== session.placementBatchId;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.classSession.update({
        where: { id },
        data: {
          title: dto.title ? dto.title.trim() : undefined,
          subjectId: targetSubjectId,
          venueId: targetVenueId,
          staffId: conductingStaffId,
          departmentId: targetDeptId || null,
          courseId: targetCourseId || null,
          placementBatchId: targetPbId || null,
          sessionDate: sessionDateObj,
          startTime: start,
          endTime: end,
        },
        include: {
          subject: true,
          venue: true,
          staff: true,
          department: true,
          course: true,
          placementBatch: true,
        },
      });

      if (isScopeChanged) {
        await tx.sessionStudent.deleteMany({ where: { sessionId: id } });

        const newTargetStudents = await tx.student.findMany({
          where: {
            status: UserStatus.ACTIVE,
            isPlacementEligible: true,
            user: { status: UserStatus.ACTIVE },
            ...(targetDeptId && { departmentId: targetDeptId }),
            ...(targetCourseId && { courseId: targetCourseId }),
            ...(targetPbId && { placementBatchId: targetPbId }),
          },
          select: { id: true },
        });

        if (newTargetStudents.length > 0) {
          await tx.sessionStudent.createMany({
            data: newTargetStudents.map((s) => ({
              sessionId: id,
              studentId: s.id,
              isEligible: true,
            })),
          });
        }
      }

      await this.auditLogService.log({
        userId: currentUser.id,
        action: 'SESSION_UPDATED',
        entity: 'ClassSession',
        entityId: id,
        details: { updatedFields: Object.keys(dto), scopeChanged: isScopeChanged },
        ipAddress,
      });

      return updated;
    });

    // Post-Commit Notification Processing
    if (hasTriggerFieldChanged) {
      const rosterEntries = await this.prisma.sessionStudent.findMany({
        where: { sessionId: id, isEligible: true },
        include: { student: { select: { userId: true } } },
      });

      const recipientUserIds = rosterEntries.map((r) => r.student.userId);
      if (recipientUserIds.length > 0) {
        await this.notificationsService.dispatchNotifications({
          recipientUserIds,
          title: 'Placement Session Updated',
          body: 'The details of your scheduled placement session have been updated.',
          payload: {
            notificationType: NotificationType.SESSION_UPDATED,
            relatedEntityId: id,
            sessionId: id,
          },
        });
      }
    }

    return updatedSession;
  }

  // ==========================================
  // UPDATE SESSION STATUS (LIFECYCLE)
  // ==========================================

  async updateStatus(id: string, status: SessionStatus, currentUser: any, ipAddress?: string) {
    const session = await this.findOne(id);

    if (currentUser.role === UserRole.STAFF) {
      const staff = await this.prisma.staff.findUnique({ where: { userId: currentUser.id } });
      if (!staff || session.staffId !== staff.id) {
        throw new ForbiddenException('STAFF can only update status of sessions they conduct');
      }
    }

    const updatedSession = await this.prisma.classSession.update({
      where: { id },
      data: { status },
      include: {
        subject: true,
        venue: true,
        staff: true,
        department: true,
        course: true,
        placementBatch: true,
      },
    });

    await this.auditLogService.log({
      userId: currentUser.id,
      action: status === SessionStatus.CANCELLED ? 'SESSION_CANCELLED' : 'SESSION_STATUS_CHANGED',
      entity: 'ClassSession',
      entityId: id,
      details: { previousStatus: session.status, newStatus: status },
      ipAddress,
    });

    // Post-Commit Notification Processing for Session Start & Cancellation
    if (status === SessionStatus.IN_PROGRESS && session.status !== SessionStatus.IN_PROGRESS) {
      const rosterEntries = await this.prisma.sessionStudent.findMany({
        where: { sessionId: id, isEligible: true },
        include: { student: { select: { userId: true } } },
      });

      const recipientUserIds = rosterEntries.map((r) => r.student.userId);
      if (recipientUserIds.length > 0) {
        const bodyText = session.description?.trim()
          ? session.description.trim()
          : `${session.title} has started.`;
        await this.notificationsService.dispatchNotifications({
          recipientUserIds,
          title: 'Session Started',
          body: bodyText,
          payload: {
            notificationType: NotificationType.SESSION_STARTED,
            relatedEntityId: id,
            sessionId: id,
          },
        });
      }
    } else if (status === SessionStatus.CANCELLED) {
      const rosterEntries = await this.prisma.sessionStudent.findMany({
        where: { sessionId: id, isEligible: true },
        include: { student: { select: { userId: true } } },
      });

      const recipientUserIds = rosterEntries.map((r) => r.student.userId);
      if (recipientUserIds.length > 0) {
        await this.notificationsService.dispatchNotifications({
          recipientUserIds,
          title: 'Placement Session Cancelled',
          body: 'The scheduled placement session has been cancelled.',
          payload: {
            notificationType: NotificationType.SESSION_CANCELLED,
            relatedEntityId: id,
            sessionId: id,
          },
        });
      }
    }

    return updatedSession;
  }
}
