-- 0001_init — the complete schema, day one.
-- Matches prisma/schema.prisma exactly (Prisma DDL conventions).
-- Regenerate after schema changes with:
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script

-- Enums
CREATE TYPE "JobStatus" AS ENUM ('APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "JobSource" AS ENUM ('LINKEDIN', 'COMPANY_WEBSITE', 'REFERRAL', 'RECRUITER', 'JOB_BOARD', 'OTHER');
CREATE TYPE "JobEventType" AS ENUM ('CREATED', 'STATUS_CHANGE', 'NOTE_ADDED', 'RESTORED');

-- Tables
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'APPLIED',
    "dateApplied" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followUpDate" TIMESTAMP(3),
    "source" "JobSource",
    "url" TEXT,
    "location" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" "JobEventType" NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Job_userId_deletedAt_idx" ON "Job"("userId", "deletedAt");
CREATE INDEX "Job_userId_dateApplied_idx" ON "Job"("userId", "dateApplied");
CREATE INDEX "Job_userId_status_idx" ON "Job"("userId", "status");
CREATE INDEX "JobEvent_jobId_createdAt_idx" ON "JobEvent"("jobId", "createdAt");

-- Foreign keys
ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobEvent" ADD CONSTRAINT "JobEvent_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
