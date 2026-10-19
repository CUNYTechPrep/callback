import { describe, it, expect, beforeAll } from "vitest";

// The Examples in docs/specs/jobs/list.md: adding a job through the same
// validate → create path the /jobs/new Server Action uses, plus the error
// mapping that turns failures into { error: { code, message } }.

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;

  const { prisma } = await import("@project/db");
  await prisma.user.create({ data: { id: "user-a", name: "A" } });
  await prisma.user.create({ data: { id: "user-b", name: "B" } });
}, 30000);

describe("adding a job", () => {
  it("creates an APPLIED job dated today with one CREATED event, and lists it", async () => {
    const { CreateJob, createJob, listJobs } = await import("@project/domain");
    const { prisma } = await import("@project/db");

    const job = await createJob("user-a", CreateJob.parse({ company: "Acme", title: "SWE" }));

    expect(job.status).toBe("APPLIED");
    expect(job.dateApplied.toISOString().slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    const events = await prisma.jobEvent.findMany({ where: { jobId: job.id } });
    expect(events.map((e) => e.type)).toEqual(["CREATED"]);
    expect((await listJobs("user-a")).map((j) => j.id)).toContain(job.id);
  });

  it("rejects an empty company as 400 VALIDATION and writes nothing", async () => {
    const { CreateJob } = await import("@project/domain");
    const { prisma } = await import("@project/db");
    const { mapError } = await import("../../apps/web/lib/errors");
    const before = await prisma.job.count();

    const parsed = CreateJob.safeParse({ company: "", title: "SWE" });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.flatten().fieldErrors.company).toEqual(["Company is required"]);
    expect(mapError(parsed.error)).toEqual({
      status: 400,
      body: { error: { code: "VALIDATION", message: "Company is required" } },
    });
    expect(await prisma.job.count()).toBe(before);
  });

  it("keeps user A's new job out of user B's list", async () => {
    const { CreateJob, createJob, listJobs } = await import("@project/domain");

    const job = await createJob("user-a", CreateJob.parse({ company: "Private Co", title: "SWE" }));

    expect((await listJobs("user-b")).map((j) => j.id)).not.toContain(job.id);
  });

  it("lists newest dateApplied first", async () => {
    const { CreateJob, createJob, listJobs } = await import("@project/domain");

    await createJob("user-b", CreateJob.parse({ company: "Old", title: "X", dateApplied: "2026-01-01" }));
    await createJob("user-b", CreateJob.parse({ company: "New", title: "X", dateApplied: "2026-03-01" }));

    expect((await listJobs("user-b")).map((j) => j.company)).toEqual(["New", "Old"]);
  });
});

describe("mapError", () => {
  it("maps Prisma P2002 to 409 and P2025 to 404", async () => {
    const { Prisma } = await import("@project/db");
    const { mapError } = await import("../../apps/web/lib/errors");
    const known = (code: string) =>
      new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

    expect(mapError(known("P2002"))).toEqual({
      status: 409,
      body: { error: { code: "CONFLICT", message: "Already exists" } },
    });
    expect(mapError(known("P2025"))).toEqual({
      status: 404,
      body: { error: { code: "NOT_FOUND", message: "Not found" } },
    });
  });

  it("maps anything else to 500 without leaking the error text", async () => {
    const { mapError } = await import("../../apps/web/lib/errors");

    const { status, body } = mapError(new Error("password=hunter2 at db.internal:5432"));

    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Something went wrong" } });
  });
});
