import { describe, it, expect, beforeAll, vi } from "vitest";
import { safeCallbackUrl } from "../../packages/auth/src/redirect";
import { UnauthenticatedError } from "../../packages/auth/src/errors";

// The pure guards around sign-in: no email-based linking, same-origin-only
// callbackUrl, and the 401 mapping (docs/specs/auth/sign-in.md).

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  const { prisma } = await import("@project/db");
  await prisma.user.create({
    data: {
      id: "guard-linked",
      email: "linked@example.com",
      accounts: { create: { type: "oauth", provider: "github", providerAccountId: "gh-linked" } },
    },
  });
  await prisma.user.create({ data: { id: "guard-unlinked", email: "taken@example.com" } });
}, 30000);

describe("refuseEmailCollision", () => {
  const run = async (args: { providerAccountId: string; email: string }) => {
    const { prisma } = await import("@project/db");
    const { refuseEmailCollision } = await import("../../packages/auth/src/link-guard");
    return refuseEmailCollision(prisma, { provider: "github", ...args });
  };

  it("refuses a new GitHub account whose email belongs to an unlinked user", async () => {
    expect(await run({ providerAccountId: "gh-new", email: "taken@example.com" })).toBe(true);
  });
  it("allows the same email when that GitHub account is already linked", async () => {
    expect(await run({ providerAccountId: "gh-linked", email: "linked@example.com" })).toBe(false);
  });
  it("allows a new email", async () => {
    expect(await run({ providerAccountId: "gh-fresh", email: "fresh@example.com" })).toBe(false);
  });
});

describe("safeCallbackUrl", () => {
  it("keeps same-origin paths", () => {
    expect(safeCallbackUrl("/jobs/x")).toBe("/jobs/x");
  });
  it.each(["https://evil.example", "//evil.example", "/\\evil", undefined, ""])(
    "sends %j to /jobs",
    (raw) => {
      expect(safeCallbackUrl(raw)).toBe("/jobs");
    }
  );
});

describe("mapError", () => {
  it("maps UnauthenticatedError to 401 UNAUTHENTICATED without logging", async () => {
    const { mapError } = await import("../../apps/web/lib/errors");
    const { log } = await import("../../packages/log/src/index");
    const spy = vi.spyOn(log, "error");
    expect(mapError(new UnauthenticatedError())).toEqual({
      status: 401,
      body: { error: { code: "UNAUTHENTICATED", message: "Sign in to continue" } },
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
