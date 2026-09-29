import { Controller, Get, Post, Param, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { GenerateQrTokenDto } from './dto/generate-qr-token.dto';
import { ScanQrTokenDto } from './dto/scan-qr-token.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Attendance Management & QR Scanning')
@ApiBearerAuth()
@Controller()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('attendance/qr/token')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Request short-lived attendance QR token (Student only)' })
  async generateQrToken(
    @Body() dto: GenerateQrTokenDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.attendanceService.generateQrToken(dto, currentUser, ipAddress);
  }

  @Post('attendance/qr/scan')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Scan QR token and record student attendance (Requires active Staff profile)' })
  async scanQrToken(
    @Body() dto: ScanQrTokenDto,
    @CurrentUser() currentUser: any,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.socket?.remoteAddress;
    return this.attendanceService.scanQrToken(dto, currentUser, ipAddress);
  }

  @Get('sessions/:sessionId/attendance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get session attendance list and summary statistics' })
  async getSessionAttendance(
    @Param('sessionId') sessionId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.attendanceService.getSessionAttendance(sessionId, currentUser);
  }

  @Get('attendance/my')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get current student attendance history' })
  async getMyAttendance(@CurrentUser() currentUser: any) {
    return this.attendanceService.getMyAttendance(currentUser);
  }
}
