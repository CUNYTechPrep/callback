import { describe, it, expect, beforeAll } from "vitest";

// Integration tests for the three promises of the data model
// (docs/specs/jobs/data-model.md): scoping, soft delete, and
// history-rides-the-change. Real queries against a REAL Postgres —
// PGlite, in memory, inside this test process.

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;

  const { prisma } = await import("@project/db");
  await prisma.user.create({ data: { id: "test-user", name: "Test User" } });
  await prisma.user.create({ data: { id: "other-user", name: "Somebody Else" } });
}, 30000);

describe("promise 3 — history rides the change", () => {
  it("creates a job WITH its CREATED event, transactionally", async () => {
    const { CreateJob, createJob } = await import("@project/domain");
    const { prisma } = await import("@project/db");

    const job = await createJob("test-user", CreateJob.parse({ company: "Datadog", title: "Software Engineer" }));
    expect(job.status).toBe("APPLIED");

    const events = await prisma.jobEvent.findMany({ where: { jobId: job.id } });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("CREATED");
    expect(events[0].toStatus).toBe("APPLIED");
  });
});

describe("promise 1 — every query is scoped", () => {
  it("lists only the requesting user's jobs", async () => {
    const { CreateJob, createJob, listJobs } = await import("@project/domain");

    await createJob("other-user", CreateJob.parse({ company: "NotYours Inc", title: "Theirs" }));

    const mine = await listJobs("test-user");
    expect(mine.map((j) => j.company)).toContain("Datadog");
    expect(mine.map((j) => j.company)).not.toContain("NotYours Inc");
  });

  it("treats a foreign job id exactly like a missing one", async () => {
    const { CreateJob, createJob, getJob } = await import("@project/domain");

    const theirs = await createJob("other-user", CreateJob.parse({ company: "Ramp", title: "SWE" }));
    expect(await getJob(theirs.id, "test-user")).toBeNull();
    expect(await getJob("no-such-id", "test-user")).toBeNull();
  });
});

describe("promise 2 — soft delete hides, never destroys", () => {
  it("hides soft-deleted jobs from list and get", async () => {
    const { CreateJob, createJob, listJobs, getJob } = await import("@project/domain");
    const { prisma } = await import("@project/db");

    const doomed = await createJob("test-user", CreateJob.parse({ company: "Doomed Co", title: "Ghost" }));
    await prisma.job.update({ where: { id: doomed.id }, data: { deletedAt: new Date() } });

    expect((await listJobs("test-user")).map((j) => j.company)).not.toContain("Doomed Co");
    expect(await getJob(doomed.id, "test-user")).toBeNull();

    // …but the row still exists — soft delete destroys nothing.
    const raw = await prisma.job.findUnique({ where: { id: doomed.id } });
    expect(raw?.deletedAt).not.toBeNull();
  });
});

describe("boundary validation", () => {
  it("rejects invalid input before it reaches the database", async () => {
    const { CreateJob } = await import("@project/domain");

    expect(CreateJob.safeParse({ company: "", title: "SWE" }).success).toBe(false);
    expect(
      CreateJob.safeParse({ company: "A", title: "B", salaryMin: 90_000, salaryMax: 80_000 }).success
    ).toBe(false);
    const ok = CreateJob.safeParse({ company: "A", title: "B" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.status).toBe("APPLIED");
  });
});
