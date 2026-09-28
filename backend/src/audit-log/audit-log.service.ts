import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogOptions {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(options: CreateAuditLogOptions) {
    try {
      const sanitizedDetails = options.details ? this.sanitize(options.details) : undefined;

      await this.prisma.auditLog.create({
        data: {
          userId: options.userId ?? null,
          action: options.action,
          entity: options.entity,
          entityId: options.entityId ?? null,
          details: sanitizedDetails ?? undefined,
          ipAddress: options.ipAddress ?? null,
        },
      });
    } catch (error) {
      // Audit logging failures should not crash the main application request
      console.error('Failed to create audit log entry:', error);
    }
  }

  private sanitize(obj: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'passwordhash', 'token', 'authorization', 'secret', 'accesstoken'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
