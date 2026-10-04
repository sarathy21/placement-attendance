-- CreateTable
CREATE TABLE "placement_batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startYear" INTEGER,
    "endYear" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "placement_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placement_batches_name_key" ON "placement_batches"("name");

-- Add placementBatchId columns
ALTER TABLE "students" ADD COLUMN "placementBatchId" TEXT;
ALTER TABLE "class_sessions" ADD COLUMN "placementBatchId" TEXT;

-- Migrate data from legacy batches to placement_batches
INSERT INTO "placement_batches" ("id", "name", "startYear", "endYear", "createdAt", "updatedAt")
SELECT "id", "name", "startYear", "endYear", "createdAt", "updatedAt"
FROM "batches"
ON CONFLICT ("name") DO NOTHING;

-- Transfer references from batchId to placementBatchId
UPDATE "students" SET "placementBatchId" = "batchId" WHERE "batchId" IS NOT NULL;
UPDATE "class_sessions" SET "placementBatchId" = "batchId" WHERE "batchId" IS NOT NULL;

-- Drop old foreign keys
ALTER TABLE "students" DROP CONSTRAINT "students_departmentId_fkey";
ALTER TABLE "students" DROP CONSTRAINT "students_courseId_fkey";
ALTER TABLE "students" DROP CONSTRAINT "students_batchId_fkey";
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_batchId_fkey";

-- Alter columns to nullable
ALTER TABLE "students" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "students" ALTER COLUMN "courseId" DROP NOT NULL;

-- Drop old batchId columns
ALTER TABLE "students" DROP COLUMN "batchId";
ALTER TABLE "class_sessions" DROP COLUMN "batchId";

-- Drop old batches table
DROP TABLE "batches";

-- Add new foreign keys
ALTER TABLE "students" ADD CONSTRAINT "students_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_placementBatchId_fkey" FOREIGN KEY ("placementBatchId") REFERENCES "placement_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_placementBatchId_fkey" FOREIGN KEY ("placementBatchId") REFERENCES "placement_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
