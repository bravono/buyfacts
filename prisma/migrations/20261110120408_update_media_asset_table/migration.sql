-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "folder" TEXT DEFAULT 'uploads',
ADD COLUMN     "objectKey" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "MediaAsset_objectKey_idx" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_folder_idx" ON "MediaAsset"("folder");
