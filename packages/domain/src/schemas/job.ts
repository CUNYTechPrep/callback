// Validation schema for job create inputs. Runs at the boundary before any
// database operation — invalid shapes never reach the database.
import { z } from "zod";
import { Job, JobSource, JobStatus } from '@project/db'

export const JOB_STATUSES = [
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN"
] as const;

type JOB_STATUS_IS_EXHAUSTIVE = typeof JOB_STATUSES[number] extends JobStatus 
  ? JobStatus extends typeof JOB_STATUSES[number] ? true : false 
  : false;

const jobStatusExhaustive: JOB_STATUS_IS_EXHAUSTIVE = true

export const JOB_SOURCES = [
  "LINKEDIN",
  "COMPANY_WEBSITE",
  "REFERRAL",
  "RECRUITER",
  "JOB_BOARD",
  "OTHER",
] as const;

type JOB_SOURCES_IS_EXHAUSTIVE = typeof JOB_SOURCES[number] extends JobSource 
  ? JobSource extends typeof JOB_SOURCES[number] ? true : false 
  : false;

const jobSourceExhaustive: JOB_SOURCES_IS_EXHAUSTIVE = true

export const CreateJob = z
  .object({
    company: z.string().trim().min(1, "Company is required").max(200),
    title: z.string().trim().min(1, "Title is required").max(200),
    status: z.enum(JOB_STATUSES).default("APPLIED"),
    dateApplied: z.coerce.date(),
    followUpDate: z.coerce.date().nullable(),
    source: z.enum(JOB_SOURCES).nullable(),
    url: z.string().url().max(2000).nullable(),
    location: z.string().trim().max(200).nullable(),
    salaryMin: z.number().int().nonnegative().nullable(),
    salaryMax: z.number().int().nonnegative().nullable(),
    notes: z.string().max(5000).optional().default(""),
  })
  .refine(
    (j) => j.salaryMin == null || j.salaryMax == null || j.salaryMin <= j.salaryMax,
    { message: "salaryMin cannot exceed salaryMax", path: ["salaryMin"] }
  );

type CreateJobMatchesPrisma = CreateJobInput extends Omit<Job, 'id' | 'deletedAt' | 'updatedAt' | 'createdAt' | 'userId'> ? true : false;

const createJobMatchesPisma: CreateJobMatchesPrisma = true

if (jobSourceExhaustive && jobStatusExhaustive && createJobMatchesPisma) {
  // all good!
}

export type CreateJobInput = z.infer<typeof CreateJob>;


