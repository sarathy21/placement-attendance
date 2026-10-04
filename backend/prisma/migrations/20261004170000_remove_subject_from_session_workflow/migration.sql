-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN "description" TEXT;
ALTER TABLE "class_sessions" DROP CONSTRAINT "class_sessions_subjectId_fkey";
ALTER TABLE "class_sessions" ALTER COLUMN "subjectId" DROP NOT NULL;
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
