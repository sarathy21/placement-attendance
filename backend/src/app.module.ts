import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, AuditLogModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


