import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { AcademicModule } from './academic/academic.module';
import { VenuesModule } from './venues/venues.module';
import { SubjectsModule } from './subjects/subjects.module';
import { SessionsModule } from './sessions/sessions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { FcmModule } from './fcm/fcm.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlacementDrivesModule } from './placement-drives/placement-drives.module';
import { StaffModule } from './staff/staff.module';

@Module({
  imports: [
    PrismaModule,
    AuditLogModule,
    AuthModule,
    StudentsModule,
    StaffModule,
    AcademicModule,
    VenuesModule,
    SubjectsModule,
    SessionsModule,
    AttendanceModule,
    FcmModule,
    DevicesModule,
    NotificationsModule,
    PlacementDrivesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
