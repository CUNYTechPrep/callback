import { describe, it, expect, beforeAll, vi } from "vitest";

// GET /api/health against in-memory PGlite (docs/specs/web.md § Health endpoint).

let GET: () => Promise<Response>;

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  ({ GET } = await import("../../apps/web/app/api/health/route"));
}, 30000);

describe("GET /api/health", () => {
  it("returns 200 ok when the database answers", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", db: "ok" });
  });

  it("returns 503 db:error when the database is unreachable", async () => {
    const { prisma } = await import("@project/db");
    const spy = vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("down"));
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ status: "ok", db: "error" });
    } finally {
      spy.mockRestore();
    }
  });
});
