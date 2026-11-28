-- CreateTable
CREATE TABLE "LogEvent" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "message" TEXT,
    "requestId" TEXT,
    "route" TEXT,
    "method" TEXT,
    "status" INTEGER,
    "durationMs" INTEGER,
    "actorEmail" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "entityId" TEXT,
    "errorName" TEXT,
    "errorMessage" TEXT,
    "stack" TEXT,
    "context" TEXT,

    CONSTRAINT "LogEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEvent_ts_idx" ON "LogEvent"("ts");

-- CreateIndex
CREATE INDEX "LogEvent_level_ts_idx" ON "LogEvent"("level", "ts");

-- CreateIndex
CREATE INDEX "LogEvent_category_ts_idx" ON "LogEvent"("category", "ts");

-- CreateIndex
CREATE INDEX "LogEvent_requestId_idx" ON "LogEvent"("requestId");

-- CreateIndex
CREATE INDEX "LogEvent_route_idx" ON "LogEvent"("route");
