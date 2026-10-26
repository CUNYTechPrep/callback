import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";

// The /jobs/new Server Action end to end against PGlite, with only Next's
// navigation helpers and the @project/auth seam mocked (docs/specs/jobs/list.md).

const nav = vi.hoisted(() => ({
  user: "action-user" as string | null, // null = signed out
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT ${to}`);
  }),
  revalidatePath: vi.fn(),
}));
// Mocked by path: `next` and `@project/auth` are dependencies of apps/web,
// not of the repo root, so their bare names don't resolve from here.
vi.mock("../../apps/web/node_modules/next/navigation.js", () => ({ redirect: nav.redirect }));
vi.mock("../../apps/web/node_modules/next/cache.js", () => ({ revalidatePath: nav.revalidatePath }));
vi.mock("../../packages/auth/src/index.ts", async () => {
  const { UnauthenticatedError } = await import("../../packages/auth/src/errors");
  return {
    UnauthenticatedError,
    currentUserId: async () => {
      if (nav.user === null) throw new UnauthenticatedError();
      return nav.user;
    },
  };
});

type Action = typeof import("../../apps/web/app/jobs/new/actions").createJobAction;
let createJobAction: Action;

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  const { prisma } = await import("@project/db");
  await prisma.user.create({ data: { id: "action-user", name: "Action" } });
  ({ createJobAction } = await import("../../apps/web/app/jobs/new/actions"));
}, 30000);

beforeEach(() => {
  nav.redirect.mockClear();
  nav.revalidatePath.mockClear();
});

function form(fields: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

describe("createJobAction", () => {
  it("creates the job for the current user, revalidates /jobs, and redirects there", async () => {
    const { listJobs } = await import("@project/domain");

    await expect(createJobAction(null, form({ company: "Acme", title: "SWE" }))).rejects.toThrow(
      "REDIRECT /jobs"
    );

    expect(nav.revalidatePath).toHaveBeenCalledWith("/jobs");
    const [job] = (await listJobs("action-user")).filter((j) => j.company === "Acme");
    expect(job?.status).toBe("APPLIED");
  });

  it("returns VALIDATION with field errors and the submitted values, writing nothing", async () => {
    const { prisma } = await import("@project/db");
    const before = await prisma.job.count();

    const state = await createJobAction(null, form({ company: "", title: "SWE", status: "APPLIED" }));

    expect(state?.error.code).toBe("VALIDATION");
    expect(state?.fieldErrors?.company).toEqual(["Company is required"]);
    expect(state?.values).toMatchObject({ company: "", title: "SWE" });
    expect(nav.redirect).not.toHaveBeenCalled();
    expect(await prisma.job.count()).toBe(before);
  });

  it("maps a database failure to 500 INTERNAL without leaking it", async () => {
    nav.user = "no-such-user"; // FK violation on Job.userId
    try {
      const state = await createJobAction(null, form({ company: "Acme", title: "SWE" }));
      expect(state?.error).toEqual({ code: "INTERNAL", message: "Something went wrong" });
      expect(nav.redirect).not.toHaveBeenCalled();
    } finally {
      nav.user = "action-user";
    }
  });

  it("returns 401 UNAUTHENTICATED when signed out, writing nothing", async () => {
    const { prisma } = await import("@project/db");
    const before = await prisma.job.count();
    nav.user = null;
    try {
      const state = await createJobAction(null, form({ company: "Ghost", title: "SWE" }));
      expect(state?.error.code).toBe("UNAUTHENTICATED");
      expect(await prisma.job.count()).toBe(before);
      expect(nav.redirect).not.toHaveBeenCalled();
      expect(nav.revalidatePath).not.toHaveBeenCalled();
    } finally {
      nav.user = "action-user";
    }
  });
});
