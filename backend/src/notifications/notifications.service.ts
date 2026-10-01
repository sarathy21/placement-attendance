import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { FcmService } from '../fcm/fcm.service';
import { GetNotificationsFilterDto } from './dto/get-notifications-filter.dto';
import { UserStatus, Prisma } from '@prisma/client';

export interface DispatchNotificationParams {
  recipientUserIds: string[];
  title: string;
  body: string;
  payload: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly fcmService: FcmService,
  ) {}

  // ==========================================
  // 1. GET NOTIFICATIONS (PAGINATED, USER ONLY)
  // ==========================================

  async getNotifications(userId: string, filter: GetNotificationsFilterDto) {
    const { page = 1, limit = 20, unreadOnly } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [total, unreadCount, data] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        unreadCount,
      },
    };
  }

  // ==========================================
  // 2. GET UNREAD COUNT
  // ==========================================

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  // ==========================================
  // 3. MARK ONE NOTIFICATION READ
  // ==========================================

  async markAsRead(userId: string, notificationId: string, ipAddress?: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.isRead) {
      return notification;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    await this.auditLogService.log({
      userId,
      action: 'NOTIFICATION_MARKED_READ',
      entity: 'Notification',
      entityId: notificationId,
      details: { notificationId },
      ipAddress,
    });

    return updated;
  }

  // ==========================================
  // 4. MARK ALL NOTIFICATIONS READ
  // ==========================================

  async markAllAsRead(userId: string, ipAddress?: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    if (result.count > 0) {
      await this.auditLogService.log({
        userId,
        action: 'NOTIFICATION_MARKED_READ',
        entity: 'Notification',
        details: { count: result.count, all: true },
        ipAddress,
      });
    }

    return { count: result.count };
  }

  // ==========================================
  // 5. POST-COMMIT DISPATCH WORKFLOW
  // ==========================================

  async dispatchNotifications(params: DispatchNotificationParams): Promise<{
    success: boolean;
    deliveredPushCount?: number;
    reason?: string;
  }> {
    const { recipientUserIds, title, body, payload } = params;

    if (!recipientUserIds || recipientUserIds.length === 0) {
      return { success: true, deliveredPushCount: 0 };
    }

    // Deduplicate recipient user IDs
    const uniqueUserIds = Array.from(new Set(recipientUserIds));

    // STEP A: Database Persistence
    try {
      await this.prisma.notification.createMany({
        data: uniqueUserIds.map((uId) => ({
          userId: uId,
          title,
          body,
          payload: payload ? (payload as Prisma.InputJsonValue) : Prisma.JsonNull,
          isRead: false,
        })),
      });

      await this.auditLogService.log({
        action: 'NOTIFICATION_CREATED',
        entity: 'Notification',
        details: {
          notificationType: payload?.notificationType || 'UNKNOWN',
          recipientCount: uniqueUserIds.length,
        },
      });
    } catch (dbError) {
      this.logger.error('Notification database persistence failed post-commit', dbError);
      // Boundary rule: Do NOT attempt FCM if DB persistence fails, but DO NOT fail caller operation!
      return { success: false, reason: 'DB_PERSISTENCE_FAILED' };
    }

    // STEP B: Active User & Device Filtering
    let deviceTokenRecords;
    try {
      deviceTokenRecords = await this.prisma.deviceToken.findMany({
        where: {
          userId: { in: uniqueUserIds },
          user: { status: UserStatus.ACTIVE },
        },
        include: {
          user: {
            include: {
              student: true,
            },
          },
        },
      });
    } catch (queryErr) {
      this.logger.error('Failed to query device tokens for notification dispatch', queryErr);
      return { success: false, reason: 'DEVICE_TOKEN_QUERY_FAILED' };
    }

    // Filter out inactive or ineligible student device tokens
    const validDeviceRecords = deviceTokenRecords.filter((rec) => {
      if (rec.user.status !== UserStatus.ACTIVE) return false;
      if (rec.user.student) {
        if (
          rec.user.student.status !== UserStatus.ACTIVE ||
          !rec.user.student.isPlacementEligible
        ) {
          return false;
        }
      }
      return true;
    });

    if (validDeviceRecords.length === 0) {
      return { success: true, deliveredPushCount: 0 };
    }

    // Build FCM payload (convert all values to string)
    const stringPayload: Record<string, string> = {};
    if (payload) {
      for (const [key, val] of Object.entries(payload)) {
        if (val !== undefined && val !== null) {
          stringPayload[key] = String(val);
        }
      }
    }

    const tokenStrings = validDeviceRecords.map((r) => r.token);

    // STEP C: FCM Dispatch
    try {
      const fcmResult = await this.fcmService.sendMulticast(tokenStrings, title, body, stringPayload);

      // STEP D: Invalid FCM Token Cleanup
      if (fcmResult.invalidTokens && fcmResult.invalidTokens.length > 0) {
        for (const invalidTok of fcmResult.invalidTokens) {
          const matchingRecord = validDeviceRecords.find((r) => r.token === invalidTok);
          if (matchingRecord) {
            await this.prisma.deviceToken
              .deleteMany({ where: { id: matchingRecord.id } })
              .catch((err) => this.logger.error('Failed deleting invalid FCM token', err));

            await this.auditLogService.log({
              userId: matchingRecord.userId,
              action: 'DEVICE_TOKEN_REMOVED',
              entity: 'DeviceToken',
              entityId: matchingRecord.id,
              details: {
                platform: matchingRecord.platform,
                reason: 'INVALID_FCM_TOKEN',
              },
            });
          }
        }
      }

      // STEP E: Audit Delivery Failure if non-token errors occurred
      if (fcmResult.failureCount > fcmResult.invalidTokens.length) {
        const firstError = fcmResult.errors.find(
          (e) =>
            e.code !== 'messaging/registration-token-not-registered' &&
            e.code !== 'messaging/invalid-registration-token',
        );
        await this.auditLogService.log({
          action: 'NOTIFICATION_DELIVERY_FAILED',
          entity: 'Notification',
          details: {
            errorCode: firstError?.code || 'messaging/unknown-error',
            failedTokensCount: fcmResult.failureCount,
          },
        });
      }

      return { success: true, deliveredPushCount: fcmResult.successCount };
    } catch (fcmErr) {
      this.logger.error('FCM dispatch threw exception', fcmErr);
      await this.auditLogService.log({
        action: 'NOTIFICATION_DELIVERY_FAILED',
        entity: 'Notification',
        details: {
          errorCode: 'messaging/internal-error',
          failedTokensCount: validDeviceRecords.length,
        },
      });
      return { success: false, reason: 'FCM_DISPATCH_EXCEPTION' };
    }
  }
}
