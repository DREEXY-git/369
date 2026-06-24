-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "actorId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunLog" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobRunLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSchedule" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "everyMs" INTEGER NOT NULL DEFAULT 0,
    "cron" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL DEFAULT '',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLocationLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "address" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'gps_punch',
    "withinWorkingHours" BOOLEAN NOT NULL DEFAULT true,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeLocationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_jobType_status_idx" ON "JobRun"("jobType", "status");

-- CreateIndex
CREATE INDEX "JobRun_tenantId_createdAt_idx" ON "JobRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "JobRun_status_createdAt_idx" ON "JobRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobRunLog_jobRunId_createdAt_idx" ON "JobRunLog"("jobRunId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobSchedule_jobType_key" ON "JobSchedule"("jobType");

-- CreateIndex
CREATE INDEX "EmployeeLocationLog_tenantId_userId_recordedAt_idx" ON "EmployeeLocationLog"("tenantId", "userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "JobRunLog" ADD CONSTRAINT "JobRunLog_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
