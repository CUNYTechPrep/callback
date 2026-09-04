// Validation schema for job create inputs. Runs at the boundary before any
// database operation — invalid shapes never reach the database.
import { z } from "zod";

export const JOB_STATUSES = [
  "APPLIED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const JOB_SOURCES = [
  "LINKEDIN",
  "COMPANY_WEBSITE",
  "REFERRAL",
  "RECRUITER",
  "JOB_BOARD",
  "OTHER",
] as const;

export const CreateJob = z
  .object({
    company: z.string().trim().min(1, "Company is required").max(200),
    title: z.string().trim().min(1, "Title is required").max(200),
    status: z.enum(JOB_STATUSES).default("APPLIED"),
    dateApplied: z.coerce.date().optional(),
    followUpDate: z.coerce.date().nullish(),
    source: z.enum(JOB_SOURCES).nullish(),
    url: z.string().url().max(2000).nullish(),
    location: z.string().trim().max(200).nullish(),
    salaryMin: z.number().int().nonnegative().nullish(),
    salaryMax: z.number().int().nonnegative().nullish(),
    notes: z.string().max(5000).optional().default(""),
  })
  .refine(
    (j) => j.salaryMin == null || j.salaryMax == null || j.salaryMin <= j.salaryMax,
    { message: "salaryMin cannot exceed salaryMax", path: ["salaryMin"] }
  );

export type CreateJobInput = z.infer<typeof CreateJob>;
