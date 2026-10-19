// Web-only domain logic: input validation schemas and database queries.
// The worker does not import from this package.
export {
  CreateJob,
  type CreateJobInput,
  JOB_STATUSES,
  JOB_SOURCES,
} from "./schemas/job";
export { listJobs, getJob, createJob } from "./queries/jobs";
// Re-exported so web can recognize validation errors without depending on zod.
export { ZodError } from "zod";
