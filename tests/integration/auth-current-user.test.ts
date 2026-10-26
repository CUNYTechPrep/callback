import { describe, it, expect, beforeAll, vi } from "vitest";

// currentUserId() through the real Auth.js auth() against PGlite: only the
// request cookie (next/headers) is faked. See docs/specs/auth/sign-in.md.

const req = vi.hoisted(() => ({ cookie: "", extra: {} as Record<string, string> }));
const fakeHeaders = () => new Headers({ cookie: req.cookie, ...req.extra });
// Mocked by path, like jobs-action.test.ts: `next` isn't a root dependency.
vi.mock("../../apps/web/node_modules/next/headers.js", () => ({
  headers: async () => fakeHeaders(),
  cookies: async () => ({ get: () => undefined, getAll: () => [] }),
}));

const HOUR = 60 * 60 * 1000;
let currentUserId: () => Promise<string>;
let UnauthenticatedError: typeof import("../../packages/auth/src/errors").UnauthenticatedError;

beforeAll(async () => {
  process.env.PGLITE_DATA_DIR = "memory://";
  delete process.env.DATABASE_URL;
  process.env.AUTH_SECRET = "test-secret";
  process.env.AUTH_URL = "http://localhost:3000";
  const { prisma } = await import("@project/db");
  await prisma.user.create({ data: { id: "cu-a", name: "A" } });
  await prisma.user.create({ data: { id: "cu-b", name: "B" } });
  await prisma.session.create({
    data: { sessionToken: "valid-a", userId: "cu-a", expires: new Date(Date.now() + 24 * HOUR) },
  });
  await prisma.session.create({
    data: { sessionToken: "expired-a", userId: "cu-a", expires: new Date(Date.now() - HOUR) },
  });
  ({ currentUserId } = await import("../../packages/auth/src/current-user"));
  ({ UnauthenticatedError } = await import("../../packages/auth/src/errors"));
}, 30000);

const signedInAs = (token: string) => {
  req.cookie = `authjs.session-token=${token}`;
  req.extra = {};
};

describe("currentUserId()", () => {
  it("returns the user id of a valid database session", async () => {
    signedInAs("valid-a");
    expect(await currentUserId()).toBe("cu-a");
  });

  it("throws UnauthenticatedError for an expired session", async () => {
    signedInAs("expired-a");
    await expect(currentUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("throws UnauthenticatedError once the session row is deleted", async () => {
    const { prisma } = await import("@project/db");
    await prisma.session.create({
      data: { sessionToken: "doomed", userId: "cu-a", expires: new Date(Date.now() + 24 * HOUR) },
    });
    signedInAs("doomed");
    expect(await currentUserId()).toBe("cu-a");
    await prisma.session.delete({ where: { sessionToken: "doomed" } });
    await expect(currentUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("throws UnauthenticatedError with no cookie", async () => {
    req.cookie = "";
    req.extra = {};
    await expect(currentUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("ignores an x-user-id header", async () => {
    signedInAs("valid-a");
    req.extra = { "x-user-id": "cu-b" };
    expect(await currentUserId()).toBe("cu-a");
  });

  it("does not fall back to a header when signed out", async () => {
    req.cookie = "";
    req.extra = { "x-user-id": "cu-b" };
    await expect(currentUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
