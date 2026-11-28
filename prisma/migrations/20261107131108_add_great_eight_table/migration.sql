-- CreateTable
CREATE TABLE "GreatEightItem" (
    "id" SERIAL NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 1,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT DEFAULT '',
    "description" TEXT DEFAULT '',
    "seeItUrl" TEXT,
    "hearItUrl" TEXT,
    "readItUrl" TEXT,
    "iconUrl" TEXT,
    "iconColor" TEXT,
    "bgColor" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreatEightItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GreatEightItem_slug_key" ON "GreatEightItem"("slug");
