import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred. Please try again later.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message
          ? Array.isArray(obj.message)
            ? obj.message.join(', ')
            : obj.message
          : exception.message;
        code = obj.code || this.getCodeFromStatus(status);
        details = obj.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle known Prisma DB errors gracefully
      this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`, exception.stack);

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          code = 'DUPLICATE_RESOURCE';
          const target = (exception.meta?.target as string[]) || [];
          message = target.length > 0
            ? `A record with this ${target.join(', ')} already exists.`
            : 'A record with duplicate unique fields already exists.';
          break;
        case 'P2003':
          status = HttpStatus.CONFLICT;
          code = 'FOREIGN_KEY_CONFLICT';
          message = 'Cannot complete operation because dependent records exist or referenced resource was not found.';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          code = 'NOT_FOUND';
          message = 'The requested resource was not found or has already been removed.';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          code = `DATABASE_ERROR_${exception.code}`;
          message = 'Database operation failed validation rules.';
          break;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = this.sanitizeMessage(exception.message);
    } else {
      this.logger.error(`Unknown Exception: ${JSON.stringify(exception)}`);
    }

    response.status(status).json({
      statusCode: status,
      code,
      message: this.sanitizeMessage(message),
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private sanitizeMessage(msg: string): string {
    if (!msg) return 'An unexpected error occurred. Please try again later.';
    const technicalKeywords = [
      'prisma',
      'p2002',
      'p2003',
      'p2025',
      'foreign key constraint',
      'unique constraint',
      'syntax error',
      'sqlite',
      'postgresql',
      'mysql',
    ];
    const lower = msg.toLowerCase();
    if (technicalKeywords.some((kw) => lower.includes(kw))) {
      return 'Cannot complete operation due to a data conflict or database constraint.';
    }
    return msg;
  }

  private getCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      default:
        return 'HTTP_ERROR';
    }
  }
}
