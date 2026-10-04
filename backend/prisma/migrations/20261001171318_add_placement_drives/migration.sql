-- CreateEnum
CREATE TYPE "DriveStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "placement_drives" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "driveDate" DATE NOT NULL,
    "venue" TEXT NOT NULL,
    "description" TEXT,
    "status" "DriveStatus" NOT NULL DEFAULT 'UPCOMING',
    "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_drives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "placement_drive_rounds" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "roundName" TEXT NOT NULL,
    "roundOrder" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "venue" TEXT,
    "description" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_drive_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placement_drive_rounds_sessionId_key" ON "placement_drive_rounds"("sessionId");

-- AddForeignKey
ALTER TABLE "placement_drives" ADD CONSTRAINT "placement_drives_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_drive_rounds" ADD CONSTRAINT "placement_drive_rounds_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "placement_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_drive_rounds" ADD CONSTRAINT "placement_drive_rounds_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
