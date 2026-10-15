-- AlterTable
ALTER TABLE "cubicon_tasks" ADD COLUMN "correct_coordinates" TEXT DEFAULT '';
ALTER TABLE "cubicon_tasks" ADD COLUMN "end_point" TEXT DEFAULT '';
ALTER TABLE "cubicon_tasks" ADD COLUMN "mid_point" TEXT DEFAULT '';
ALTER TABLE "cubicon_tasks" ADD COLUMN "start_point" TEXT DEFAULT '';
ALTER TABLE "cubicon_tasks" ADD COLUMN "tolerance" REAL DEFAULT 0.5;
