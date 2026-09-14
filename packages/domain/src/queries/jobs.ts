// Database queries for jobs. Every query is scoped by userId — no exceptions.
// A change that implies history writes its JobEvent in the same transaction
// (see docs/specs/jobs/data-model.md for the three promises).
import { prisma } from "@project/db";
import type { CreateJobInput } from "../schemas/job";

export function listJobs(userId: string) {
  return prisma.job.findMany({
    where: { userId, deletedAt: null },
    orderBy: { dateApplied: "desc" },
  });
}

export function getJob(id: string, userId: string) {
  return prisma.job.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

export async function createJob(userId: string, input: CreateJobInput) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.create({
      data: {
        userId,
        company: input.company,
        title: input.title,
        status: input.status,
        dateApplied: input.dateApplied,
        followUpDate: input.followUpDate,
        source: input.source,
        url: input.url,
        location: input.location,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        notes: input.notes,
      },
    });
    await tx.jobEvent.create({
      data: { jobId: job.id, type: "CREATED", toStatus: job.status },
    });
    return job;
  });
}
